import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Profile, Role, User } from '@prisma/client';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { UpdateMyProfileRequest } from './dto/update-my-profile.request';
import { Public } from 'src/common/decorator/public.decorator';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService
    ) { }

    @ApiOperation({ summary: 'Check if a pseudo is already used' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The pseudo is already used'
    })
    @Public()
    @Get('check-pseudo')
    checkIfPseudoAlreadyUsed(
        @Query('pseudo') pseudo: string
    ): Promise<void> {
        return this.usersService.checkIfPseudoAlreadyUsed({ pseudo });
    }

    @ApiOperation({ summary: 'Get user profile' })
    @ApiCookieAuth('accessToken')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'This profile has been successfully retrieved'
    })
    @Get('profile/:userId')
    getUserProfile(
        @Param('userId') userId: string,
    ): Promise<User & { Profile: Profile, _count: any }> {
        return this.usersService.findUser({ id: userId });
    }

    @ApiOperation({ summary: 'Get my profile' })
    @ApiCookieAuth('accessToken')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The profile has been successfully retrieved'
    })
    @Get('my-profile')
    getMyProfile(
        @GetUser() user: User
    ): Promise<User & { Profile: Profile, _count: any }> {
        return this.usersService.getMyProfile({ user });
    }

    @ApiOperation({ summary: 'Update my profile' })
    @ApiCookieAuth('accessToken')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The profile has been successfully updated',
    })
    @Patch('my-profile')
    updateMyProfile(
        @GetUser() user: User,
        @Query() updateMyProfileRequest: UpdateMyProfileRequest
    ): Promise<User & { Profile: Profile }> {
        return this.usersService.updateMyProfile({ user, updateMyProfileRequest });
    }

    @ApiOperation({ summary: 'Delete my profile' })
    @ApiCookieAuth('accessToken')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The account has been successfully deleted',
        type: String
    })
    @Delete('my-profile')
    deleteMyProfile(
        @GetUser() user: User
    ): Promise<string> {
        return this.usersService.deleteMyProfile({ user });
    }
}
