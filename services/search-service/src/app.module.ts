import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    }),
    SearchModule,
  ],
})
export class AppModule {}
