import { Controller, Delete, Get, Post, Req } from '@nestjs/common';
import { SessionsService } from './sessions.service.js';
import { Public } from '../decorators/public/public.decorator.js';

@Controller('sessions')
export class SessionsController {
    constructor(private sessionService: SessionsService){}

    @Get()
    async list(@Req() req){
        return this.sessionService.listUserSessions(req.user.sub);
    }

    @Delete(":id")
    async delete(@Req() req,){
        const sessionId = req.params.id;
        await this.sessionService.revokeSession(sessionId);
        return { message: 'Session revoked successfully.' };
    }

    @Delete()
    async revokeAll(@Req() req){
        await this.sessionService.revokeUserSessions(req.user.sub);
        return { message: 'All sessions revoked successfully.' };
    }
}
