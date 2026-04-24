import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../auth/decorators/current-user/current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
    constructor(private readonly userService: UsersService){}


    @Get('me')
    async getProfile(@CurrentUser('sub') userId: string){
        return this.userService.getUserById(userId);
    }

    @Patch('me')
    async updateProfile(
        @CurrentUser('sub') userId: string,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.userService.updateUserProfile(userId, dto);
    }
}
