import { Body, Controller, Get, Param, Patch, ValidationPipe } from '@nestjs/common'
import { PointHistory, TransactionType, UserPoint } from './point.model'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'
import { PointBody as PointDto } from './point.dto'


@Controller('/point')
export class PointController {

    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    @Get(':id')
    async point(@Param('id') id): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        const userPoint = await this.userDb.selectById(userId)
        return userPoint
        // return { id: userId, point: 0, updateMillis: Date.now() }
    }

    @Get(':id/histories')
    async history(@Param('id') id): Promise<PointHistory[]> {
        const userId = Number.parseInt(id)
        const histories = await this.historyDb.selectAllByUserId(userId)
        return histories
        // return []
    }

    @Patch(':id/charge')
    async charge(
        @Param('id') id,
        @Body(ValidationPipe) pointDto: PointDto,
    ): Promise<UserPoint> {
        // 데이터 조회
        const userId = Number.parseInt(id)
        const userPoint = await this.userDb.selectById(userId)
        const newAmount = userPoint.point + pointDto.amount

        // 데이터 반영
        const updatedData = await this.userDb.insertOrUpdate(userId, newAmount)

        // [+히스토리] 유저ID, 포인트량, 작업종류, 작업시간
        await this.historyDb.insert(
            userId,
            pointDto.amount,
            TransactionType.CHARGE,
            updatedData.updateMillis
        )

        return updatedData
        // return { id: userId, point: pointDto.amount, updateMillis: Date.now() }
    }

    @Patch(':id/use')
    async use(
        @Param('id') id,
        @Body(ValidationPipe) pointDto: PointDto,
    ): Promise<UserPoint> {
        // 데이터 조회
        const userId = Number.parseInt(id)
        const userPoint = await this.userDb.selectById(userId)
        const newAmount = userPoint.point - pointDto.amount

        // [예외1] 잔고 부족
        if (newAmount < 0) {
            throw new Error('포인트의 잔고가 부족합니다.')
        }

        // 데이터 반영
        const updatedData = await this.userDb.insertOrUpdate(userId, newAmount)

        // [+히스토리] 유저ID, 포인트량, 작업종류, 작업시간
        await this.historyDb.insert(
            userId,
            pointDto.amount,
            TransactionType.USE,
            updatedData.updateMillis
        )

        return updatedData
        // return { id: userId, point: pointDto.amount, updateMillis: Date.now() }
    }
}
