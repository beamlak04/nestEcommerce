import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Roles } from './auth/decorators/roles/roles.decorator.js';
import { Public } from './auth/decorators/public/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/admin')
  @Roles('ADMIN')
  getHello(){
    return {message: 'Hello Admin! This is a protected route.'}
  }


  @Get('/user')
  profile(@Req() req){
    return req.user;
  }
}
