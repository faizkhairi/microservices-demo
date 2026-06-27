import { Controller, Get } from '@nestjs/common';
import { CircuitBreakerService } from '../proxy/circuit-breaker.service';

@Controller('health')
export class HealthController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('circuit')
  getCircuitStates() {
    return {
      circuits: this.circuitBreakerService.getStates(),
      timestamp: new Date().toISOString(),
    };
  }
}
