import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';

@UseGuards(AuthGuard('jwt'))
@Controller('customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) {}

    @Post(':id/pay')
    async payDebt(
        @Req() req: any,
        @Param('id') customerId: string,
        @Body('amount') amount: number,
    ) {
        return this.customersService.payDebt(req.user.storeId, Number(customerId), amount);
    }
}
