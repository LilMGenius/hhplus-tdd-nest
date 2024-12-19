import { Test, TestingModule } from '@nestjs/testing'
import { PointController } from './point.controller'
import { TransactionType } from './point.model'
import { PointService } from './point.service'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'
import { PointBody as PointDto } from './point.dto'


describe('PointController', () => {
    let pointController: PointController;
    let userDbMock: Partial<UserPointTable>;
    let historyDbMock: Partial<PointHistoryTable>;

    beforeEach(async () => {
        // UserPointTable Mock
        userDbMock = {
            selectById: jest.fn(),
            insertOrUpdate: jest.fn(),
        };

        // PointHistoryTable Mock
        historyDbMock = {
            insert: jest.fn(),
            selectAllByUserId: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PointController],
            providers: [
                PointService,
                { provide: UserPointTable, useValue: userDbMock },
                { provide: PointHistoryTable, useValue: historyDbMock },
            ],
        }).compile();

        // PointController Mock
        pointController = module.get<PointController>(PointController);
    })

    describe('GET /point/:id', () => {
        it('존재하는 유저인 경우에만, 포인트 반환', async () => {
            (userDbMock.selectById as jest.Mock).mockResolvedValue({
                id: 1,
                point: 100,
                updateMillis: 1000,
            });

            const result = await pointController.point('1');
            expect(result).toEqual({ id: 1, point: 100, updateMillis: 1000 });
            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
        })

        it('존재하지 않는 유저인 경우에는, 기본값(0) 반환', async () => {
            (userDbMock.selectById as jest.Mock).mockResolvedValue({
                id: 2,
                point: 0,
                updateMillis: 9999,
            });

            const result = await pointController.point('2');
            expect(result.point).toBe(0);
            expect(userDbMock.selectById).toHaveBeenCalledWith(2);
        })
    })

    describe('GET /point/:id/histories', () => {
        it('유저의 히스토리(유저ID, 포인트량, 작업종류, 작업시간) 반환', async () => {
            const mockHistories = [
                {
                    id: 1,
                    userId: 1,
                    amount: 50,
                    type: TransactionType.CHARGE,
                    timeMillis: 1000000000,
                },
                {
                    id: 2,
                    userId: 1,
                    amount: 20,
                    type: TransactionType.USE,
                    timeMillis: 1000010000,
                },
            ];
            (historyDbMock.selectAllByUserId as jest.Mock).mockResolvedValue(mockHistories);

            const result = await pointController.history('1');
            expect(result).toEqual(mockHistories);
            expect(historyDbMock.selectAllByUserId).toHaveBeenCalledWith(1);
        })
    })

    describe('PATCH /point/:id/charge', () => {
        it('유저의 포인트 충전 및 히스토리 추가', async () => {
            const initialUser = { id: 1, point: 100, updateMillis: 1000 };
            const chargedUser = { id: 1, point: 150, updateMillis: 2000 };

            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);
            (userDbMock.insertOrUpdate as jest.Mock).mockResolvedValue(chargedUser);
            (historyDbMock.insert as jest.Mock).mockResolvedValue({
                id: 1,
                userId: 1,
                amount: 50,
                type: TransactionType.CHARGE,
                timeMillis: 2000,
            });

            const dto: PointDto = { amount: 50 };
            const result = await pointController.charge('1', dto);

            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
            expect(userDbMock.insertOrUpdate).toHaveBeenCalledWith(1, 150);
            expect(historyDbMock.insert).toHaveBeenCalledWith(
                1,
                50,
                TransactionType.CHARGE,
                2000,
            );

            expect(result).toEqual(chargedUser);
        })
    })

    describe('PATCH /point/:id/use', () => {
        it('잔고가 충분한 경우에만, 유저의 포인트 사용 및 히스토리 추가', async () => {
            const initialUser = { id: 1, point: 100, updateMillis: 1000 };
            const usedUser = { id: 1, point: 70, updateMillis: 2000 };

            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);
            (userDbMock.insertOrUpdate as jest.Mock).mockResolvedValue(usedUser);
            (historyDbMock.insert as jest.Mock).mockResolvedValue({
                id: 2,
                userId: 1,
                amount: 30,
                type: TransactionType.USE,
                timeMillis: 2000,
            });

            const dto: PointDto = { amount: 30 };
            const result = await pointController.use('1', dto);

            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
            expect(userDbMock.insertOrUpdate).toHaveBeenCalledWith(1, 70);
            expect(historyDbMock.insert).toHaveBeenCalledWith(
                1,
                30,
                TransactionType.USE,
                2000,
            );

            expect(result).toEqual(usedUser);
        })

        it('잔고가 부족한 경우에는, 예외(Throw) 발생', async () => {
            const initialUser = { id: 1, point: 20, updateMillis: 1000 };
            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);

            const dto: PointDto = { amount: 30 };
            await expect(pointController.use('1', dto)).rejects.toThrow('포인트의 잔고가 부족합니다.');

            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
            expect(userDbMock.insertOrUpdate).not.toHaveBeenCalled();
            expect(historyDbMock.insert).not.toHaveBeenCalled();
        })
    })
})
