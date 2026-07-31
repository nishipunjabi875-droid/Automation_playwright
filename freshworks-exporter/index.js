const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const auth = require('./auth');
const api = require('./api');
const DataExporter = require('./exporter');
const { mapConcurrent, generateStatistics, ensureDir, formatDateIso } = require('./utils');

/**
 * Main Freshworks Omni Conversation Exporter Application
 */
async function main() {
  console.log('====================================================');
  console.log('🚀 FRESHWORKS OMNI CONVERSATION EXPORTER (V2)');
  console.log('====================================================');
  console.log(`📌 Target Domain : ${auth.getBaseUrl()}`);
  console.log(`📌 Output Dir    : ${auth.outputDir}`);
  console.log(`📌 Concurrency   : ${auth.concurrencyLimit}`);
  console.log(`📌 Download Media: ${auth.downloadAttachments ? 'YES' : 'NO'}`);
  if (auth.startDate || auth.endDate) {
    console.log(`📌 Date Filter   : ${auth.startDate ? auth.startDate.toISOString().split('T')[0] : 'Beginning'} to ${auth.endDate ? auth.endDate.toISOString().split('T')[0] : 'Latest'}`);
  }
  console.log('----------------------------------------------------');

  const startTime = Date.now();
  const exporter = new DataExporter(auth.outputDir);
  const failedConversations = [];
  const allExtractedRecords = [];

  // Step 1: Fetch all conversation metadata records
  let conversations = [];
  try {
    conversations = await api.fetchAllConversations({
      startDate: auth.startDate,
      endDate: auth.endDate,
      onPageFetched: (currentTotal, pageCount) => {
        process.stdout.write(`\r📥 Conversations loaded: ${currentTotal}...`);
      }
    });
    console.log('\n');
  } catch (err) {
    console.error('❌ Critical failure retrieving conversations list:', err.message);
    process.exit(1);
  }

  if (conversations.length === 0) {
    console.log('ℹ️ No conversations found matching the criteria. Exiting.');
    return;
  }

  // Step 2: Initialize CLI Progress Bar for fetching messages per conversation
  console.log(`🔄 Fetching messages & metadata for ${conversations.length} conversations...`);
  const progressBar = new cliProgress.SingleBar({
    format: 'Processing [{bar}] {percentage}% | {value}/{total} Conversations | ETA: {eta}s',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true
  });

  progressBar.start(conversations.length, 0);

  const attachmentDir = path.join(auth.outputDir, 'attachments');
  if (auth.downloadAttachments) {
    ensureDir(attachmentDir);
  }

  // Step 3: Process conversations concurrently
  await mapConcurrent(auth.concurrencyLimit, conversations, async (conv) => {
    const convId = conv.id || conv.conversation_id;
    try {
      // Extract conversation level properties
      const channel = conv.channel || conv.channel_type || conv.source || 'WhatsApp/Omni';
      const status = conv.status || conv.state || 'Resolved';
      const tags = Array.isArray(conv.tags) ? conv.tags : (conv.tags ? [conv.tags] : []);
      const customProps = conv.custom_properties || conv.properties || {};

      // Fetch customer details if available
      let customerName = 'Unknown';
      let customerPhone = '';
      let customerEmail = '';
      let customerId = conv.user_id || conv.customer_id || '';

      if (customerId) {
        const userDetails = await api.fetchUserDetails(customerId);
        if (userDetails) {
          customerName = [userDetails.first_name, userDetails.last_name].filter(Boolean).join(' ') || userDetails.name || customerName;
          customerPhone = userDetails.phone || userDetails.mobile || userDetails.phone_number || '';
          customerEmail = userDetails.email || '';
        }
      }

      // Fetch messages for this conversation
      const messages = await api.fetchMessagesForConversation(convId);

      if (!messages || messages.length === 0) {
        // Record at least conversation level record if no messages returned
        allExtractedRecords.push({
          conversationId: convId,
          channel,
          customerName,
          customerId,
          customerPhone,
          customerEmail,
          agentName: '',
          agentId: '',
          messageId: '',
          senderType: 'System',
          messageText: '[No Messages Found]',
          messageType: 'text',
          timestamp: formatDateIso(conv.created_time || conv.created_at),
          attachments: [],
          mediaUrls: [],
          conversationStatus: status,
          tags,
          customProperties: customProps
        });
      } else {
        for (const msg of messages) {
          const messageId = msg.id || msg.message_id || '';
          const senderType = msg.actor_type || msg.sender_type || (msg.actor_id === customerId ? 'Customer' : 'Agent');
          const messageText = msg.message_parts ? msg.message_parts.map(p => p.text ? p.text.content : '').join(' ') : (msg.text || msg.body || '');
          const messageType = msg.message_type || msg.type || 'text';
          const msgTimestamp = formatDateIso(msg.created_time || msg.created_at || msg.timestamp);

          // Extract agent info
          let agentId = msg.actor_id || msg.agent_id || conv.assigned_agent_id || '';
          let agentName = '';
          if (senderType === 'Agent' || senderType === 'agent') {
            const agentDetails = await api.fetchAgentDetails(agentId);
            if (agentDetails) {
              agentName = [agentDetails.first_name, agentDetails.last_name].filter(Boolean).join(' ') || agentDetails.name || '';
            }
          }

          // Extract Attachments & Media URLs
          const attachments = [];
          const mediaUrls = [];

          if (msg.message_parts && Array.isArray(msg.message_parts)) {
            for (const part of msg.message_parts) {
              if (part.image || part.file || part.media || part.attachment) {
                const mediaObj = part.image || part.file || part.media || part.attachment;
                const mediaUrl = mediaObj.url || mediaObj.file_url || mediaObj.src;
                if (mediaUrl) {
                  mediaUrls.push(mediaUrl);

                  if (auth.downloadAttachments) {
                    const ext = path.extname(mediaUrl.split('?')[0]) || '.bin';
                    const filename = `${convId}_${messageId}_${Date.now()}${ext}`;
                    const localPath = await api.downloadAttachment(mediaUrl, attachmentDir, filename);
                    if (localPath) {
                      attachments.push(localPath);
                    }
                  } else {
                    attachments.push(mediaUrl);
                  }
                }
              }
            }
          }

          allExtractedRecords.push({
            conversationId: convId,
            channel,
            customerName,
            customerId,
            customerPhone,
            customerEmail,
            agentName,
            agentId,
            messageId,
            senderType,
            messageText: messageText.trim(),
            messageType,
            timestamp: msgTimestamp,
            attachments,
            mediaUrls,
            conversationStatus: status,
            tags,
            customProperties: customProps
          });
        }
      }
    } catch (err) {
      failedConversations.push({
        conversationId: convId,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      progressBar.increment();
    }
  });

  progressBar.stop();
  console.log('\n✅ Conversation & Message extraction completed.');

  // Step 4: Save failed conversation IDs into failed.json
  if (failedConversations.length > 0) {
    const failedFilePath = path.join(auth.outputDir, 'failed.json');
    fs.writeFileSync(failedFilePath, JSON.stringify(failedConversations, null, 2), 'utf8');
    console.warn(`⚠️ ${failedConversations.length} conversations encountered errors. Saved list to: ${failedFilePath}`);
  } else {
    console.log('🎉 0 failures encountered during extraction.');
  }

  // Step 5: Generate summary statistics
  console.log('📊 Calculating summary statistics...');
  const stats = generateStatistics(conversations, allExtractedRecords);

  // Step 6: Export results to Excel, CSV, and JSON
  console.log('💾 Writing exported data files...');
  await exporter.exportJson(allExtractedRecords, 'conversations_export.json');
  await exporter.exportCsv(allExtractedRecords, 'conversations_export.csv');
  await exporter.exportExcel(allExtractedRecords, stats, 'conversations_export.xlsx');
  await exporter.exportSummary(stats, 'summary_statistics.json');

  // Step 7: Display summary report
  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n====================================================');
  console.log('✨ EXTRACTION SUMMARY REPORT');
  console.log('====================================================');
  console.log(`⏱️ Total Execution Time: ${durationSec} seconds`);
  console.log(`💬 Total Conversations : ${stats.totalConversations}`);
  console.log(`✉️ Total Messages      : ${stats.totalMessages}`);
  console.log('📱 Messages by Channel :');
  for (const [ch, cnt] of Object.entries(stats.messagesByChannel)) {
    console.log(`   - ${ch}: ${cnt}`);
  }
  console.log('🏆 Top Active Agents    :');
  for (const [ag, cnt] of Object.entries(stats.topActiveAgents)) {
    console.log(`   - ${ag}: ${cnt} msgs`);
  }
  console.log('====================================================');
  console.log('📁 Output Files Generated in:', path.resolve(auth.outputDir));
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('💥 Unhandled Application Error:', err);
  process.exit(1);
});
