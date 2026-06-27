import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

const TASKS_INDEX = 'tasks';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly esService: ElasticsearchService) {}

  async onModuleInit() {
    await this.ensureIndex();
  }

  private async ensureIndex() {
    const exists = await this.esService.indices.exists({ index: TASKS_INDEX });
    if (!exists) {
      await this.esService.indices.create({
        index: TASKS_INDEX,
        mappings: {
          properties: {
            taskId: { type: 'keyword' },
            userId: { type: 'keyword' },
            title: { type: 'text' },
            status: { type: 'keyword' },
            indexedAt: { type: 'date' },
          },
        },
      });
      this.logger.log(`Created index: ${TASKS_INDEX}`);
    }
  }

  async indexTask(taskId: string, userId: string, title: string, status: string = 'PENDING') {
    await this.esService.index({
      index: TASKS_INDEX,
      id: taskId,
      document: { taskId, userId, title, status, indexedAt: new Date() },
    });
    this.logger.log(`Indexed task: ${taskId}`);
  }

  async updateTask(taskId: string, status: string) {
    await this.esService.update({
      index: TASKS_INDEX,
      id: taskId,
      doc: { status, updatedAt: new Date() },
    });
  }

  async deleteTask(taskId: string) {
    await this.esService.delete({ index: TASKS_INDEX, id: taskId }).catch(() => {
      // Ignore 404 — task may not have been indexed
    });
  }

  async search(query: string, userId?: string) {
    const must: any[] = [{ multi_match: { query, fields: ['title'] } }];
    if (userId) {
      must.push({ term: { userId } });
    }

    const result = await this.esService.search({
      index: TASKS_INDEX,
      query: { bool: { must } },
    });

    return {
      total: (result.hits.total as any)?.value ?? 0,
      hits: result.hits.hits.map((h) => h._source),
    };
  }

  async healthCheck() {
    const health = await this.esService.cluster.health();
    return { status: health.status, index: TASKS_INDEX };
  }
}
