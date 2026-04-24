import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
    async sendSms(phone: string, message: string) {
        // Integrate with a real SMS provider in production.
        void phone;
        void message;
        console.log(`Simulated SMS to ${phone}: ${message}`);
    }
}
