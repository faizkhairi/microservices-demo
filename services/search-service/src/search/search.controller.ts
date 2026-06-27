import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string = '',
    @Query('userId') userId?: string,
  ) {
    return this.searchService.search(query, userId);
  }

  @Get('health')
  health() {
    return this.searchService.healthCheck();
  }
}
