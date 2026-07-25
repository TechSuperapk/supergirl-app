import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { env } from '../config/env';

// Uses the EC2 instance role's credentials by default (no keys in code). If
// you instead put AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env, the SDK
// picks those up automatically too.
const sns = new SNSClient({ region: env.awsRegion });

/** Send a transactional SMS to an E.164 phone number via Amazon SNS. */
export async function sendSms(phone: string, message: string): Promise<void> {
  const attrs: Record<string, any> = {
    'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
  };
  if (env.snsSenderId) {
    attrs['AWS.SNS.SMS.SenderID'] = { DataType: 'String', StringValue: env.snsSenderId };
  }
  await sns.send(new PublishCommand({
    PhoneNumber: phone,
    Message: message,
    MessageAttributes: attrs,
  }));
}
