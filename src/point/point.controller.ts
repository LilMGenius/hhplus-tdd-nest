import { Body, Controller, Get, Param, Patch, ValidationPipe } from '@nestjs/common'
import { PointHistory, UserPoint } from './point.model'
import { PointService } from './point.service'
import { PointBody as PointDto } from './point.dto'


@Controller('/point')
export class PointController {
    constructor(
        private readonly pointService: PointService,
    ) {}

    @Get(':id')
    async point(@Param('id') id: string): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        return this.pointService.getUserPoint(userId)
    }

    @Get(':id/histories')
    async history(@Param('id') id: string): Promise<PointHistory[]> {
        const userId = Number.parseInt(id)
        return this.pointService.getUserHistories(userId)
    }

    @Patch(':id/charge')
    async charge(
        @Param('id') id: string,
        @Body(ValidationPipe) pointDto: PointDto,
    ): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        return this.pointService.chargeUserPoint(userId, pointDto.amount)
    }

    @Patch(':id/use')
    async use(
        @Param('id') id: string,
        @Body(ValidationPipe) pointDto: PointDto,
    ): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        return this.pointService.useUserPoint(userId, pointDto.amount)
    }
}
