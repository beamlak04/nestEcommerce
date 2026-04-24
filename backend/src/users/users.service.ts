import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService){}

    private readonly profileSelect = {
        id: true,
        phone: true,
        role: true,
        isVerified: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
    } as const;

    async getUserById(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: this.profileSelect,
        });
    }


    async updateUserProfile(userId: string, dto: UpdateProfileDto) {
        return this.prisma.user.update({
            where: {id: userId},
            data: {
                ...dto,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            },
            select: this.profileSelect,
        })
    }
}
