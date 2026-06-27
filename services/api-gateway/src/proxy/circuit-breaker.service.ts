import { Injectable, Logger } from '@nestjs/common';
import * as CircuitBreaker from 'opossum';

interface CircuitState {
  name: string;
  state: 'closed' | 'open' | 'halfOpen';
  stats: {
    fires: number;
    successes: number;
    failures: number;
    fallbacks: number;
    rejects: number;
    timeouts: number;
  };
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker<any[], any>>();

  private readonly defaultOptions: CircuitBreaker.Options = {
    timeout: 5000,                  // 5s timeout per request
    errorThresholdPercentage: 50,   // open when 50% of requests fail
    resetTimeout: 30000,            // try again after 30s
    volumeThreshold: 3,             // minimum 3 requests before evaluating
  };

  getOrCreate(name: string, action: (...args: any[]) => Promise<any>): CircuitBreaker<any[], any> {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(action, {
        ...this.defaultOptions,
        name,
      });

      breaker.on('open', () => this.logger.warn(`Circuit OPENED for: ${name}`));
      breaker.on('close', () => this.logger.log(`Circuit CLOSED for: ${name}`));
      breaker.on('halfOpen', () => this.logger.log(`Circuit HALF-OPEN for: ${name}`));
      breaker.fallback(() => ({
        error: `Service ${name} is currently unavailable (circuit open)`,
        circuit: 'open',
      }));

      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  async fire(name: string, action: (...args: any[]) => Promise<any>, ...args: any[]): Promise<any> {
    const breaker = this.getOrCreate(name, action);
    return breaker.fire(...args);
  }

  getStates(): CircuitState[] {
    return Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'halfOpen' : 'closed',
      stats: breaker.stats,
    }));
  }
}
