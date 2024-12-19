import { Module } from '@nestjs/common'
import { PointController } from './point.controller'
import { DatabaseModule } from 'src/database/database.module'
import { PointService } from './point.service'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'

@Module({
    imports: [DatabaseModule],
    controllers: [PointController],
    providers: [PointService, UserPointTable, PointHistoryTable],
})
export class PointModule {}
