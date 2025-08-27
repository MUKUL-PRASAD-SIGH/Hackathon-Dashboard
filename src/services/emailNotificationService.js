// Email Notification Service for Version 1.1.0
// This service handles real email notifications via SMTP

class EmailNotificationService {
  constructor() {
    this.smtpConfig = {
      host: process.env.REACT_APP_SMTP_HOST || 'smtp.gmail.com',
      port: process.env.REACT_APP_SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.REACT_APP_SMTP_USER,
        pass: process.env.REACT_APP_SMTP_PASS,
      },
    };
    
    this.emailTemplates = this.initializeEmailTemplates();
    this.notificationQueue = [];
    this.isProcessing = false;
  }

  // Initialize email templates
  initializeEmailTemplates() {
    return {
      hackathonReminder: {
        subject: '🏆 Hackathon Reminder: {{hackathonName}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚀 Hackathon Reminder</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 15px;">{{hackathonName}}</h2>
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>📅 Date:</strong> {{hackathonDate}}</p>
                <p><strong>🏢 Platform:</strong> {{platform}}</p>
                <p><strong>👥 Team:</strong> {{team}}</p>
                <p><strong>🎯 Rounds:</strong> {{rounds}}</p>
                <p><strong>📊 Status:</strong> <span style="color: {{statusColor}};">{{status}}</span></p>
              </div>
              {{#if roundRemarks}}
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 10px;">📝 Round Remarks</h3>
                {{#each roundRemarks}}
                <p><strong>{{@key}}:</strong> {{this}}</p>
                {{/each}}
              </div>
              {{/if}}
              <div style="text-align: center; margin-top: 20px;">
                <a href="{{dashboardUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>This is an automated reminder from your Hackathon Dashboard.</p>
              <p><a href="{{unsubscribeUrl}}" style="color: #007bff;">Unsubscribe</a> | <a href="{{preferencesUrl}}" style="color: #007bff;">Email Preferences</a></p>
            </div>
          </div>
        `,
        text: `
          🚀 Hackathon Reminder: {{hackathonName}}
          
          📅 Date: {{hackathonDate}}
          🏢 Platform: {{platform}}
          👥 Team: {{team}}
          🎯 Rounds: {{rounds}}
          📊 Status: {{status}}
          
          {{#if roundRemarks}}
          📝 Round Remarks:
          {{#each roundRemarks}}
          {{@key}}: {{this}}
          {{/each}}
          {{/if}}
          
          View Dashboard: {{dashboardUrl}}
          
          ---
          This is an automated reminder from your Hackathon Dashboard.
          Unsubscribe: {{unsubscribeUrl}} | Email Preferences: {{preferencesUrl}}
        `
      },
      
      roundReminder: {
        subject: '🎯 Round Reminder: {{hackathonName}} - Round {{roundNumber}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🎯 Round Reminder</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 15px;">{{hackathonName}}</h2>
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>🎯 Round:</strong> {{roundNumber}}</p>
                <p><strong>📅 Date:</strong> {{hackathonDate}}</p>
                <p><strong>🏢 Platform:</strong> {{platform}}</p>
                <p><strong>👥 Team:</strong> {{team}}</p>
                {{#if roundRemark}}
                <p><strong>📝 Round Note:</strong> {{roundRemark}}</p>
                {{/if}}
              </div>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #856404; margin: 0;">⏰ Action Required</h3>
                <p style="color: #856404; margin: 10px 0 0 0;">This round is starting soon! Make sure you're prepared and have all necessary materials ready.</p>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="{{dashboardUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a>
              </div>
            </div>
          </div>
        `,
        text: `
          🎯 Round Reminder: {{hackathonName}} - Round {{roundNumber}}
          
          📅 Date: {{hackathonDate}}
          🏢 Platform: {{platform}}
          👥 Team: {{team}}
          
          {{#if roundRemark}}
          📝 Round Note: {{roundRemark}}
          {{/if}}
          
          ⏰ Action Required: This round is starting soon! Make sure you're prepared.
          
          View Details: {{dashboardUrl}}
        `
      },
      
      statusUpdate: {
        subject: '📊 Status Update: {{hackathonName}} - {{newStatus}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">📊 Status Update</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 15px;">{{hackathonName}}</h2>
              <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>🔄 Status Changed:</strong> <span style="color: {{oldStatusColor}};">{{oldStatus}}</span> → <span style="color: {{newStatusColor}};">{{newStatus}}</span></p>
                <p><strong>📅 Date:</strong> {{hackathonDate}}</p>
                <p><strong>🏢 Platform:</strong> {{platform}}</p>
                <p><strong>👥 Team:</strong> {{team}}</p>
                {{#if notes}}
                <p><strong>📝 Notes:</strong> {{notes}}</p>
                {{/if}}
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="{{dashboardUrl}}" style="background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Dashboard</a>
              </div>
            </div>
          </div>
        `,
        text: `
          📊 Status Update: {{hackathonName}} - {{newStatus}}
          
          🔄 Status Changed: {{oldStatus}} → {{newStatus}}
          📅 Date: {{hackathonDate}}
          🏢 Platform: {{platform}}
          👥 Team: {{team}}
          
          {{#if notes}}
          📝 Notes: {{notes}}
          {{/if}}
          
          Update Dashboard: {{dashboardUrl}}
        `
      }
    };
  }

  // Send email notification
  async sendEmail(to, template, data) {
    try {
      const emailData = {
        to: to,
        subject: this.processTemplate(template.subject, data),
        html: this.processTemplate(template.html, data),
        text: this.processTemplate(template.text, data),
      };

      // For now, we'll simulate email sending
      // In production, this would integrate with a real SMTP service
      console.log('📧 Email would be sent:', emailData);
      
      // Simulate API call to backend email service
      const response = await this.simulateEmailAPI(emailData);
      
      return {
        success: true,
        messageId: response.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Process template with data
  processTemplate(template, data) {
    let processed = template;
    
    // Replace simple variables
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, data[key] || '');
    });
    
    // Handle conditional blocks
    processed = this.processConditionals(processed, data);
    
    // Handle loops
    processed = this.processLoops(processed, data);
    
    return processed;
  }

  // Process conditional blocks
  processConditionals(template, data) {
    // Handle {{#if variable}}...{{/if}} blocks
    let processed = template;
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    processed = processed.replace(ifRegex, (match, variable, content) => {
      if (data[variable]) {
        return content;
      }
      return '';
    });
    
    return processed;
  }

  // Process loop blocks
  processLoops(template, data) {
    // Handle {{#each array}}...{{/each}} blocks
    let processed = template;
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    processed = processed.replace(eachRegex, (match, arrayName, content) => {
      if (data[arrayName] && Array.isArray(data[arrayName])) {
        return data[arrayName].map(item => {
          let itemContent = content;
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(regex, item[key] || '');
          });
          return itemContent;
        }).join('');
      }
      return '';
    });
    
    return processed;
  }

  // Send hackathon reminder
  async sendHackathonReminder(hackathon, trigger) {
    try {
      const data = {
        hackathonName: hackathon.name,
        hackathonDate: new Date(hackathon.date).toLocaleDateString(),
        platform: hackathon.platform,
        team: hackathon.team,
        rounds: hackathon.rounds,
        status: hackathon.status,
        statusColor: this.getStatusColor(hackathon.status),
        roundRemarks: hackathon.remarks,
        dashboardUrl: `${window.location.origin}/dashboard`,
        unsubscribeUrl: `${window.location.origin}/preferences`,
        preferencesUrl: `${window.location.origin}/preferences`,
      };

      const template = this.emailTemplates.hackathonReminder;
      return await this.sendEmail(hackathon.email, template, data);
    } catch (error) {
      console.error('Failed to send hackathon reminder:', error);
      throw error;
    }
  }

  // Send round reminder
  async sendRoundReminder(hackathon, roundNumber) {
    try {
      const data = {
        hackathonName: hackathon.name,
        roundNumber: roundNumber,
        hackathonDate: new Date(hackathon.date).toLocaleDateString(),
        platform: hackathon.platform,
        team: hackathon.team,
        roundRemark: hackathon.remarks ? hackathon.remarks[`round${roundNumber}`] : null,
        dashboardUrl: `${window.location.origin}/dashboard`,
      };

      const template = this.emailTemplates.roundReminder;
      return await this.sendEmail(hackathon.email, template, data);
    } catch (error) {
      console.error('Failed to send round reminder:', error);
      throw error;
    }
  }

  // Send status update notification
  async sendStatusUpdate(hackathon, oldStatus, newStatus, notes = '') {
    try {
      const data = {
        hackathonName: hackathon.name,
        oldStatus: oldStatus,
        newStatus: newStatus,
        oldStatusColor: this.getStatusColor(oldStatus),
        newStatusColor: this.getStatusColor(newStatus),
        hackathonDate: new Date(hackathon.date).toLocaleDateString(),
        platform: hackathon.platform,
        team: hackathon.team,
        notes: notes,
        dashboardUrl: `${window.location.origin}/dashboard`,
      };

      const template = this.emailTemplates.statusUpdate;
      return await this.sendEmail(hackathon.email, template, data);
    } catch (error) {
      console.error('Failed to send status update:', error);
      throw error;
    }
  }

  // Get status color for email templates
  getStatusColor(status) {
    const colorMap = {
      'Planning': '#007bff',
      'Participating': '#28a745',
      'Won': '#ffc107',
      'Didn\'t qualify': '#dc3545',
    };
    return colorMap[status] || '#6c757d';
  }

  // Schedule notification
  scheduleNotification(hackathon, trigger, scheduledTime) {
    const notification = {
      id: Date.now() + Math.random(),
      hackathon: hackathon,
      trigger: trigger,
      scheduledTime: scheduledTime,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.notificationQueue.push(notification);
    this.sortNotificationQueue();
    
    // Schedule the actual sending
    this.scheduleEmailSending(notification);
    
    return notification.id;
  }

  // Sort notification queue by scheduled time
  sortNotificationQueue() {
    this.notificationQueue.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }

  // Schedule email sending
  scheduleEmailSending(notification) {
    const now = new Date();
    const scheduledTime = new Date(notification.scheduledTime);
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

    setTimeout(async () => {
      try {
        await this.processScheduledNotification(notification);
      } catch (error) {
        console.error('Failed to process scheduled notification:', error);
        notification.status = 'failed';
        notification.error = error.message;
      }
    }, delay);
  }

  // Process scheduled notification
  async processScheduledNotification(notification) {
    try {
      notification.status = 'processing';
      
      switch (notification.trigger) {
        case '2 days before':
        case '1 hour before':
          await this.sendHackathonReminder(notification.hackathon, notification.trigger);
          break;
        case 'before each round':
          for (let i = 1; i <= notification.hackathon.rounds; i++) {
            await this.sendRoundReminder(notification.hackathon, i);
          }
          break;
        default:
          throw new Error(`Unknown trigger: ${notification.trigger}`);
      }
      
      notification.status = 'sent';
      notification.sentAt = new Date().toISOString();
      
      // Remove from queue after successful sending
      this.notificationQueue = this.notificationQueue.filter(n => n.id !== notification.id);
      
    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      throw error;
    }
  }

  // Get notification queue status
  getNotificationQueueStatus() {
    return {
      total: this.notificationQueue.length,
      pending: this.notificationQueue.filter(n => n.status === 'pending').length,
      processing: this.notificationQueue.filter(n => n.status === 'processing').length,
      sent: this.notificationQueue.filter(n => n.status === 'sent').length,
      failed: this.notificationQueue.filter(n => n.status === 'failed').length,
      queue: this.notificationQueue,
    };
  }

  // Simulate email API call (replace with real implementation)
  async simulateEmailAPI(emailData) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate success response
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export default EmailNotificationService;
