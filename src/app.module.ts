import { GraphQLModule } from '@nestjs/graphql';
import { Module, Logger } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AuthModule } from './resolvers/auth/auth.module';
import { UserModule } from './resolvers/user/user.module';
import { PostModule } from './resolvers/post/post.module';
import { AppResolver } from './resolvers/app.resolver';
import { DateScalar } from './common/scalars/date.scalar';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './configs/config';
import { GraphqlConfig } from './configs/config.interface';
import { PrismaModule } from 'nestjs-prisma';
import { loggingMiddleware } from './logging.middleware';
import { BullModule } from '@nestjs/bull';
import { QueueOptions } from 'bull';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PrismaModule.forRootAsync({
      isGlobal: true,
      useFactory: () => {
        const logger = new Logger('PrismaMiddleware');
        return { middlewares: [loggingMiddleware(logger)] }; // configure your prisma middleware
      },
    }),
    GraphQLModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const graphqlConfig = configService.get<GraphqlConfig>('graphql');
        return {
          installSubscriptionHandlers: true,
          buildSchemaOptions: {
            numberScalarMode: 'integer',
          },
          sortSchema: graphqlConfig.sortSchema,
          autoSchemaFile:
            graphqlConfig.schemaDestination || './src/schema.graphql',
          debug: graphqlConfig.debug,
          playground: graphqlConfig.playgroundEnabled,
          context: ({ req }) => ({ req }),
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: 'nest-worker',
      useFactory: async (configService: ConfigService) => {
        const bullConfig = await configService.get<QueueOptions>('bull');
        return bullConfig;
      },
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    PostModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver, DateScalar],
})
export class AppModule {}
