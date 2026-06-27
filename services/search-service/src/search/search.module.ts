import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { KafkaConsumerController } from '../kafka/kafka-consumer.controller';

@Module({
  controllers: [SearchController, KafkaConsumerController],
  providers: [SearchService],
})
export class SearchModule {}
