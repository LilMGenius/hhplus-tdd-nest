import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'


describe('Point 동시성 테스트 (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication()
        await app.init(); // 앱 시작
    })

    afterAll(async () => {
        await app.close(); // 앱 종료
    })

    it('대량의 요청을 일괄로 보내도 순차적으로 처리 => 최종 잔고 유지', async () => {
        const userId = 1;
        
        // 초기 잔고 확인 (기본값인 0일 것이다)
        const initialRes = await request(app.getHttpServer())
            .get(`/point/${userId}`)
            .expect(200);
        
        expect(initialRes.body.point).toBe(0);

        // 동시에 10번, 각 100포인트 충전 요청
        const chargeRequests = []
        for (let i = 0; i < 10; i++) {
            chargeRequests.push(
                request(app.getHttpServer())
                    .patch(`/point/${userId}/charge`)
                    .send({ amount: 100 })
                    .expect(200)
            );
        }

        // 모든 요청이 완료될 때까지 대기
        const responses = await Promise.all(chargeRequests);
        
        // 모든 요청이 정상 처리되었는지 검증
        for (const res of responses) {
            expect(res.body.id).toBe(userId);
            // 응답의 순서가 섞여도 하나씩만 처리되었다면
            // 최종 잔고는 1000 (0 + 10 * 100) 일 것이다.
        }

        // 최종 잔고 검증
        const finalRes = await request(app.getHttpServer())
            .get(`/point/${userId}`)
            .expect(200);
        
        expect(finalRes.body.point).toBe(1000);
    })

    it('잔고가 초과될 경우에는, 예외(Throw) 발생', async () => {
        const userId = 2;

        // 잔고의 한도인 10억을 넘어서는 충전 시도
        // 예: 현재 0인데 1,000,000,001 포인트 충전
        const res = await request(app.getHttpServer())
            .patch(`/point/${userId}/charge`)
            .send({ amount: 1000000001 })
            .expect(400); // Bad Request
        
        expect(res.text).toContain('포인트의 한도를 초과하였습니다. (10억)');
    })

    it('잔고가 부족한 경우에는, 예외(Throw) 발생', async () => {
        const userId = 3

        // 1. 미리 100 포인트만 충전 해놓은 상태
        await request(app.getHttpServer())
            .patch(`/point/${userId}/charge`)
            .send({ amount: 100 })
            .expect(200)

        // 2. 의도적으로 1 포인트를 초과 사용하려는 시도
        const res = await request(app.getHttpServer())
            .patch(`/point/${userId}/use`)
            .send({ amount: 101 })
            .expect(400); // Bad Request

        expect(res.text).toContain('포인트의 잔고가 부족합니다.')
    })
})
