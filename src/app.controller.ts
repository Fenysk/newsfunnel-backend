import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHello(): any {
        return { id: 'exemple-id' };
    }
}
