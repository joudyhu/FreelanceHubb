import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health endpoint', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');
    await app.init();
  });
  afterAll(async () => app.close());
  it('returns health status', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
});
