import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterRequest } from './dto/register.request';
import { CreateUserRequest } from 'src/users/dto/create-user.request';
import { SecurityService } from 'src/common/security/security.service';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from './interfaces/token-payload.interface';
import { Response } from 'express';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly securityService: SecurityService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) { }

    async verifyUser({
        email,
        password
    }: {
        email: string,
        password: string
    }): Promise<User> {
        try {
            const user = await this.usersService.findUser({ email });

            const isPasswordMatched = await this.securityService.verifyData({ hashedData: user.hashedPassword, dataToCompare: password });

            if (!isPasswordMatched)
                throw new UnauthorizedException('Invalid credentials');

            return user;
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }

    async verifyUserRefreshToken({
        refreshToken,
        userId
    }: {
        refreshToken: string,
        userId: string
    }): Promise<User> {
        try {
            const user = await this.usersService.findUser({ id: userId });

            const isRefreshTokenMatched = await this.securityService.verifyData({ hashedData: user.hashedRefreshToken, dataToCompare: refreshToken });

            if (!isRefreshTokenMatched)
                throw new UnauthorizedException('Invalid refresh token');

            return user;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async verifyUserGoogle({ googleProfile }: { googleProfile: Profile }) {
        const { emails } = googleProfile;

        const email = emails[0].value;

        let user: User;

        try {
            user = await this.usersService.findUser({ email });
        } catch (error) {
            user = await this.usersService.createUser({ email, pseudo: email });
        }

        return user;
    }

    async register({
        registerRequest,
        response
    }: {
        registerRequest: RegisterRequest,
        response: Response
    }) {
        const createUserRequest = new CreateUserRequest();

        createUserRequest.pseudo = registerRequest.pseudo;
        createUserRequest.email = registerRequest.email;
        createUserRequest.hashedPassword = await this.securityService.hashData({ data: registerRequest.password });

        const user = await this.usersService.createUser(createUserRequest);

        await this.login({ user, response });
    }

    async login({
        user,
        response
    }: {
        user: User,
        response: Response
    }) {
        // Token payload
        const tokenPayload: TokenPayload = { userId: user.id }

        // Access token
        const expirationAccessTokenMs = parseInt(
            this.configService.getOrThrow('JWT_ACCESS_TOKEN_EXPIRATION_MS')
        );

        const expiresAccessToken = new Date();

        expiresAccessToken.setMilliseconds(
            expiresAccessToken.getTime() +
            expirationAccessTokenMs
        );

        const accessToken = this.jwtService.sign(
            tokenPayload,
            {
                secret: this.configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
                expiresIn: `${expirationAccessTokenMs}ms`
            }
        );

        // Refresh token
        const expirationRefreshTokenMs = parseInt(
            this.configService.getOrThrow('JWT_REFRESH_TOKEN_EXPIRATION_MS')
        );

        const expiresRefreshToken = new Date();

        expiresRefreshToken.setMilliseconds(
            expiresRefreshToken.getTime() +
            expirationRefreshTokenMs
        );

        const refreshToken = this.jwtService.sign(
            tokenPayload,
            {
                secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
                expiresIn: `${expirationRefreshTokenMs}ms`
            }
        );

        const hashedRefreshToken = await this.securityService.hashData({ data: refreshToken });

        await this.usersService.updateUser(
            { id: user.id },
            { hashedRefreshToken }
        );

        const shouldHaveSecureConnection = this.configService.getOrThrow('NODE_ENV') !== 'development';

        // Response cookies
        response.cookie('accessToken', accessToken, {
            httpOnly: false,
            secure: shouldHaveSecureConnection,
            expires: expiresAccessToken,
        });

        response.cookie('refreshToken', refreshToken, {
            httpOnly: false,
            secure: shouldHaveSecureConnection,
            expires: expiresRefreshToken,
        });

        const userWithProfile = await this.usersService.getMyProfile({ user });

        response.json({
            tokens: {
                accessToken,
                refreshToken
            },
            user: userWithProfile
        });
    }

    async logout({
        user
    }: {
        user: User
    }): Promise<string> {
        await this.usersService.updateUser(
            { id: user.id },
            { hashedRefreshToken: null }
        );

        return `User ${user.id} has been successfully logged out`;
    }

}
