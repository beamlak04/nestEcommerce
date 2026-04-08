import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { LoginDto} from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { OtpDto } from './dto/otp.dto.js';
import type {Response}  from 'express'; 
import { Public } from './decorators/public/public.decorator.js';
import { UAParser } from 'ua-parser-js';
import { CsrfService } from './csrf/csrf.service.js';
import { CsrfProtected } from './decorators/csrf/csrf.decorator.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly csrfService: CsrfService){}

    @Public()
    @Post('login')
    async login(@Body() loginDto: LoginDto,@Req() req, @Res({passthrough: true}) res: Response){

        const parser = new UAParser(req.headers['user-agent']);
        const result = parser.getResult();
        const device = result.device.type || 'web';
        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || 'unknown';

        const tokens = await this.authService.login(loginDto.phone, loginDto.password, device, ip, userAgent);

        const csrfToken = this.csrfService.generateToken(tokens.refreshToken);
        res.cookie('csrfToken', csrfToken,{
            httpOnly: false,
            secure: true,
            sameSite: 'strict'
        })

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        });
        res.json({ accessToken: tokens.accessToken, csrfToken});
    }

    @Public()
    @Post('register')
    register(@Body() registerDto: RegisterDto){
        return this.authService.register(registerDto.name, registerDto.phone, registerDto.password);
        
    }

    @Public()
    @Post('verify')
    verify(@Body() otpDto: OtpDto){
        return this.authService.verify(otpDto.phone, otpDto.code);
    }

    @Public()
    @Post('verify/resend')
    async resendOtp(@Body("phone") phone: string){
        return this.authService.resendOtp(phone);
    }

    @Public()
    @CsrfProtected()
    @Post('refresh')
    async refresh(@Req() req, @Res({passthrough: true}) res: Response){
        const refreshToken = req.cookies['refreshToken'];
        const parser = new UAParser(req.headers['user-agent']);
        const result = parser.getResult();
        const device = result.device.type || 'web';
        const ip = req.ip;
        const userAgent = req.headers['user-agent'] || 'unknown';
        const tokens = await this.authService.refreshToken(refreshToken, device, ip, userAgent);
        const newCsrfToken = this.csrfService.generateToken(tokens.refreshToken);

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        });

        res.cookie('csrfToken', newCsrfToken, {
            httpOnly: false,
            secure: true,
            sameSite: 'strict',
        });

        res.json({ accessToken: tokens.accessToken, csrfToken: newCsrfToken });
    }
    

    @Public()
    @Post('password/request')
    requestReset(@Body("phone") phone: string){
        return this.authService.requestPasswordReset(phone);
    }

    @Public()
    @Post('password/reset')
    resetPassword(@Body() body: {phone: string, code: string, newPassword: string}){
        return this.authService.resetPassword(body.phone, body.code, body.newPassword);
    }


    @CsrfProtected()
    @Post('logout')
    async logout(@Req() req, @Res({passthrough: true}) res: Response){
        await this.authService.logout(req.cookies['refreshToken']);
        res.clearCookie('refreshToken');
        res.clearCookie('csrfToken');
        res.json({ message: 'Logged out successfully.' });
    }
}