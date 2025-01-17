import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserRequest } from './dto/create-user.request';
import { Prisma, Profile, User } from '@prisma/client';
import { UpdateMyProfileRequest } from './dto/update-my-profile.request';

@Injectable()
export class UsersService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

    async getAllUsers(): Promise<User[]> {
        return this.prismaService.user.findMany();
    }

    async getMyProfile({
        user,
    }: {
        user: User
    }): Promise<User & { Profile: Profile, _count: any }> {
        const fetchUser = await this.prismaService.user.findUnique({
            where: { id: user.id },
            include: {
                Profile: true,
                _count: true,
            }
        });

        if (!fetchUser)
            throw new NotFoundException('User not found');

        return fetchUser;
    }

    async findUser({
        id,
        email,
    }: {
        id?: string;
        email?: string;
    }): Promise<User & { Profile: Profile, _count: any }> {
        const user = await this.prismaService.user.findUnique({
            where: {
                id,
                email,
            },
            include: {
                Profile: true,
                _count: true,
            }
        });

        if (!user)
            throw new NotFoundException('User not found');

        return user;
    }

    async createUser(
        createUserRequest: CreateUserRequest
    ): Promise<User> {
        try {
            const user = await this.prismaService.user.create({
                data: {
                    email: createUserRequest.email.toLowerCase(),
                    hashedPassword: createUserRequest.hashedPassword,
                    Profile: {
                        create: {
                            pseudo: createUserRequest.pseudo,
                            displayName: createUserRequest.pseudo,
                        }
                    }
                }
            });

            return user;
        } catch (error) {
            this.prismaService.handleError(error);
        }
    }

    async updateUser(
        where: Prisma.UserWhereUniqueInput,
        data: Prisma.UserUpdateInput,
    ): Promise<User> {
        return this.prismaService.user.update({
            where,
            data,
        });
    }

    async checkIfPseudoAlreadyUsed({
        pseudo,
    }: {
        pseudo: string
    }): Promise<void> {
        const existingUser = await this.prismaService.profile.count({
            where: {
                pseudo: pseudo.toLowerCase()
            },
        });

        if (existingUser)
            throw new ConflictException('This pseudo is already used');
    }

    async updateMyProfile({
        user,
        updateMyProfileRequest,
    }: {
        user: User,
        updateMyProfileRequest: UpdateMyProfileRequest
    }): Promise<User & { Profile: Profile }> {
        if (updateMyProfileRequest.pseudo == null)
            delete updateMyProfileRequest.pseudo;

        if (updateMyProfileRequest.pseudo)
            await this.checkIfPseudoAlreadyUsed({ pseudo: updateMyProfileRequest.pseudo });

        const updatedUser = await this.prismaService.user.update({
            where: { id: user.id },
            data: {
                Profile: {
                    update: updateMyProfileRequest,
                },
            },
            include: { Profile: true }
        });

        return updatedUser;
    }

    async deleteMyProfile({
        user,
    }: {
        user: User
    }): Promise<string> {
        await this.prismaService.user.update({
            where: { id: user.id },
            data: {
                email: null,
                hashedPassword: null,
                hashedRefreshToken: null,
                Profile: {
                    delete: true,
                }
            }
        });

        return 'Profile deleted';
    }

}
