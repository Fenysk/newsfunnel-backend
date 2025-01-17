import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterRequest } from './dto/register.request';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { Response } from 'express';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/decorator/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'The user has been successfully registered'
    })
    @Public()
    @Post('register')
    register(
        @Body() registerRequest: RegisterRequest,
        @Res({ passthrough: true }) response: Response
    ) {
        return this.authService.register({ registerRequest, response });
    }

    @ApiOperation({ summary: 'Login a user' })
    @ApiQuery({
        name: 'email',
        type: 'string',
        required: true
    })
    @ApiQuery({
        name: 'password',
        type: 'string',
        required: true
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The user has been successfully logged in'
    })
    @Public()
    @Post('login')
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    async login(
        @GetUser() user: User,
        @Res({ passthrough: true }) response: Response
    ) {
        await this.authService.login({ user, response });
    }

    @ApiOperation({ summary: 'Refresh a user\'s token' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The user\'s token has been successfully refreshed'
    })
    @ApiCookieAuth('refreshToken')
    @Post('refresh')
    @Public()
    @UseGuards(JwtRefreshAuthGuard)
    @HttpCode(HttpStatus.OK)
    async refresh(
        @GetUser() user: User,
        @Res({ passthrough: true }) response: Response,
    ) {
        await this.authService.login({ user, response });
    }

    @ApiOperation({ summary: 'Logout a user' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The user has been successfully logged out'
    })
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @GetUser() user: User,
    ): Promise<string> {
        return await this.authService.logout({ user });
    }

    @ApiOperation({ summary: 'Redirect to Google login' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The user has been successfully redirected to Google login'
    })
    @Public()
    @Get('google/login')
    @UseGuards(GoogleAuthGuard)
    async googleLogin() { }

    @ApiOperation({ summary: 'Callback from Google login' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The user has been successfully logged in'
    })
    @Public()
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleCallback(
        @GetUser() user: User,
        @Res({ passthrough: true }) response: Response
    ) {
        await this.authService.login({ user, response });
    }

}
