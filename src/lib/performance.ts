/**
 * Enterprise Performance Optimization System
 *
 * Features:
 * - Intelligent caching with TTL and invalidation
 * - API request optimization and batching
 * - Memory management and cleanup
 * - Performance monitoring and optimization
 * - Lazy loading and code splitting
 * - Service worker caching strategies
 */

import React from 'react';
import { monitoring, recordMetric } from './monitoring';

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  strategy: 'lru' | 'fifo' | 'priority';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  priority?: number;
}

export interface PerformanceConfig {
  enableRequestBatching: boolean;
  enableMemoryCleanup: boolean;
  enableLazyLoading: boolean;
  enableServiceWorker: boolean;
  cacheConfigs: {
    contacts: CacheConfig;
    properties: CacheConfig;
    analytics: CacheConfig;
    api: CacheConfig;
  };
}

class EnterprisePerformance {
  private caches: Map<string, Map<string, CacheEntry<any>>> = new Map();
  private cacheConfigs: Map<string, CacheConfig> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: PerformanceConfig) {
    this.initializeCaches(config.cacheConfigs);
    this.setupPerformanceMonitoring();
    this.setupMemoryCleanup();
    this.setupServiceWorker(config.enableServiceWorker);
  }

  // 🚀 INTELLIGENT CACHING SYSTEM
  async getCached<T>(cacheKey: string, key: string, fallback: () => Promise<T>): Promise<T> {
    const cache = this.getCache(cacheKey);
    const config = this.cacheConfigs.get(cacheKey);

    if (!cache || !config) {
      throw new Error(`Cache '${cacheKey}' not configured`);
    }

    // Check if cached data exists and is valid
    const entry = cache.get(key);
    if (entry && this.isValidCacheEntry(entry)) {
      entry.hits++;
      recordMetric('cache_hit', 1, { cacheKey, key });
      return entry.data;
    }

    // Cache miss - fetch data
    recordMetric('cache_miss', 1, { cacheKey, key });

    try {
      const data = await fallback();
      this.setCached(cacheKey, key, data);
      return data;
    } catch (error) {
      recordMetric('cache_fallback_error', 1, { cacheKey, key });
      throw error;
    }
  }

  setCached<T>(cacheKey: string, key: string, data: T, customTtl?: number) {
    const cache = this.getCache(cacheKey);
    const config = this.cacheConfigs.get(cacheKey);

    if (!cache || !config) {
      console.warn(`Cache '${cacheKey}' not configured`);
      return;
    }

    // Enforce cache size limits
    if (cache.size >= config.maxSize) {
      this.evictFromCache(cacheKey, cache, config);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: customTtl || config.ttl,
      hits: 0,
      priority: this.calculatePriority(data)
    };

    cache.set(key, entry);
    recordMetric('cache_set', 1, { cacheKey, key });
  }

  invalidateCache(cacheKey: string, key?: string) {
    const cache = this.getCache(cacheKey);
    if (!cache) return;

    if (key) {
      cache.delete(key);
      recordMetric('cache_invalidate_single', 1, { cacheKey, key });
    } else {
      cache.clear();
      recordMetric('cache_invalidate_all', 1, { cacheKey });
    }
  }

  // 📦 REQUEST BATCHING AND OPTIMIZATION
  async batchRequests<T>(
    requests: Array<{ id: string; request: () => Promise<T> }>,
    batchSize: number = 10
  ): Promise<Map<string, T | Error>> {
    const results = new Map<string, T | Error>();
    const startTime = globalThis.performance.now();

    // Process requests in batches to avoid overwhelming the server
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ id, request }) => {
        try {
          const result = await request();
          results.set(id, result);
        } catch (error) {
          results.set(id, error as Error);
        }
      });

      await Promise.allSettled(batchPromises);

      // Add small delay between batches to prevent rate limiting
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const duration = globalThis.performance.now() - startTime;
    recordMetric('batch_request_duration', duration, {
      totalRequests: requests.length,
      batchSize,
      successCount: Array.from(results.values()).filter(r => !(r instanceof Error)).length
    });

    return results;
  }

  async deduplicateRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
    // If the same request is already in progress, return the existing promise
    if (this.requestQueue.has(key)) {
      recordMetric('request_deduplicated', 1, { key });
      return this.requestQueue.get(key)!;
    }

    // Execute the request and cache the promise
    const promise = request().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  // 🧠 MEMORY MANAGEMENT
  private setupMemoryCleanup() {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
      this.reportMemoryUsage();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries() {
    let totalCleaned = 0;

    for (const [cacheKey, cache] of this.caches) {
      const beforeSize = cache.size;

      for (const [key, entry] of cache) {
        if (!this.isValidCacheEntry(entry)) {
          cache.delete(key);
        }
      }

      const cleaned = beforeSize - cache.size;
      totalCleaned += cleaned;

      if (cleaned > 0) {
        recordMetric('cache_cleanup', cleaned, { cacheKey });
      }
    }

    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned up ${totalCleaned} expired cache entries`);
    }
  }

  private reportMemoryUsage() {
    try {
      const memory = (performance as any).memory;
      if (memory) {
        recordMetric('memory_used_js_heap', memory.usedJSHeapSize);
        recordMetric('memory_total_js_heap', memory.totalJSHeapSize);
        recordMetric('memory_js_heap_limit', memory.jsHeapSizeLimit);

        // Alert if memory usage is high
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercentage > 80) {
          monitoring.reportError(
            new Error(`High memory usage: ${usagePercentage.toFixed(1)}%`),
            'Memory Management',
            'medium',
            { usagePercentage, usedHeap: memory.usedJSHeapSize }
          );
        }
      }
    } catch (error) {
      // Memory API not available in all browsers
    }
  }

  // 📊 PERFORMANCE MONITORING
  private setupPerformanceMonitoring() {
    // Monitor long tasks that block the main thread
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            recordMetric('long_task_duration', entry.duration, {
              startTime: entry.startTime
            });

            if (entry.duration > 100) {
              monitoring.reportError(
                new Error(`Long task detected: ${entry.duration}ms`),
                'Performance Monitoring',
                'medium',
                { duration: entry.duration, startTime: entry.startTime }
              );
            }
          }
        });
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task observation not supported');
      }
    }

    // Monitor resource loading performance
    this.monitorResourcePerformance();
  }

  private monitorResourcePerformance() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;

          recordMetric('resource_load_time', resourceEntry.duration, {
            name: resourceEntry.name,
            type: this.getResourceType(resourceEntry.name)
          });

          // Alert on slow resources
          if (resourceEntry.duration > 3000) {
            monitoring.reportError(
              new Error(`Slow resource loading: ${resourceEntry.name}`),
              'Resource Performance',
              'medium',
              {
                duration: resourceEntry.duration,
                resource: resourceEntry.name,
                size: resourceEntry.transferSize
              }
            );
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  // 🚀 LAZY LOADING UTILITIES
  createLazyComponent<T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ) {
    const LazyComponent = React.lazy(factory);

    return React.forwardRef<any, React.ComponentProps<T>>((props, _ref: any) => {
      return React.createElement(
        React.Suspense,
        {
          fallback: fallback
            ? React.createElement(fallback)
            : React.createElement('div', null, 'Loading...')
        },
        React.createElement(LazyComponent, props as any)
      );
    });
  }

  async preloadComponent(factory: () => Promise<any>) {
    try {
      await factory();
      recordMetric('component_preload_success', 1);
    } catch (error) {
      recordMetric('component_preload_error', 1);
      monitoring.reportError(error as Error, 'Component Preloading', 'low');
    }
  }

  // 🔧 SERVICE WORKER SETUP
  private setupServiceWorker(enable: boolean) {
    if (!enable || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully');
        recordMetric('service_worker_registered', 1);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
        monitoring.reportError(error, 'Service Worker Registration', 'low');
      });
  }

  private notifyServiceWorkerUpdate() {
    // Notify user that new content is available
    const event = new CustomEvent('serviceWorkerUpdate', {
      detail: { message: 'New version available. Refresh to update.' }
    });
    window.dispatchEvent(event);
  }

  // 🔧 PRIVATE HELPER METHODS
  private initializeCaches(configs: PerformanceConfig['cacheConfigs']) {
    for (const [cacheKey, config] of Object.entries(configs)) {
      this.caches.set(cacheKey, new Map());
      this.cacheConfigs.set(cacheKey, config);
    }
  }

  private getCache(cacheKey: string): Map<string, CacheEntry<any>> | undefined {
    return this.caches.get(cacheKey);
  }

  private isValidCacheEntry(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private evictFromCache(cacheKey: string, cache: Map<string, CacheEntry<any>>, config: CacheConfig) {
    const entries = Array.from(cache.entries());

    switch (config.strategy) {
      case 'lru':
        // Remove least recently used (oldest timestamp with lowest hits)
        entries.sort((a, b) => {
          const aScore = a[1].timestamp + (a[1].hits * 1000);
          const bScore = b[1].timestamp + (b[1].hits * 1000);
          return aScore - bScore;
        });
        break;

      case 'fifo':
        // Remove oldest entries first
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        break;

      case 'priority':
        // Remove lowest priority entries first
        entries.sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0));
        break;
    }

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }

    recordMetric('cache_eviction', toRemove, { cacheKey, strategy: config.strategy });
  }

  private calculatePriority(data: any): number {
    // Simple priority calculation based on data type and size
    let priority = 1;

    if (typeof data === 'object' && data !== null) {
      const size = JSON.stringify(data).length;
      if (size > 10000) priority += 2; // Large objects get higher priority
      if (data.id || data.key) priority += 1; // Objects with IDs are more likely to be reused
    }

    return priority;
  }

  private getResourceType(url: string): string {
    if (url.includes('/api/')) return 'api';
    if (url.match(/\.(js|ts)$/)) return 'javascript';
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  // 📊 PUBLIC API
  getCacheStats() {
    const stats: Record<string, any> = {};

    for (const [cacheKey, cache] of this.caches) {
      const entries = Array.from(cache.values());
      stats[cacheKey] = {
        size: cache.size,
        maxSize: this.cacheConfigs.get(cacheKey)?.maxSize || 0,
        totalHits: entries.reduce((sum, entry) => sum + entry.hits, 0),
        averageAge: entries.length > 0
          ? entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length
          : 0
      };
    }

    return stats;
  }

  preloadCriticalResources(urls: string[]) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;

      if (url.match(/\.(js|ts)$/)) link.as = 'script';
      else if (url.match(/\.css$/)) link.as = 'style';
      else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) link.as = 'image';
      else if (url.match(/\.(woff|woff2|ttf|eot)$/)) link.as = 'font';

      document.head.appendChild(link);
    });

    recordMetric('resources_preloaded', urls.length);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.caches.clear();
    this.requestQueue.clear();
  }
}

// 🌟 DEFAULT CONFIGURATION
const defaultConfig: PerformanceConfig = {
  enableRequestBatching: true,
  enableMemoryCleanup: true,
  enableLazyLoading: true,
  enableServiceWorker: true,
  cacheConfigs: {
    contacts: {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      strategy: 'lru'
    },
    properties: {
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 500,
      strategy: 'lru'
    },
    analytics: {
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 100,
      strategy: 'priority'
    },
    api: {
      ttl: 2 * 60 * 1000, // 2 minutes
      maxSize: 200,
      strategy: 'fifo'
    }
  }
};

// 🌟 SINGLETON INSTANCE
export const performance = new EnterprisePerformance(defaultConfig);

// 🎯 CONVENIENCE FUNCTIONS
export const getCached = <T>(cacheKey: string, key: string, fallback: () => Promise<T>) =>
  performance.getCached(cacheKey, key, fallback);

export const setCached = <T>(cacheKey: string, key: string, data: T, customTtl?: number) =>
  performance.setCached(cacheKey, key, data, customTtl);

export const invalidateCache = (cacheKey: string, key?: string) =>
  performance.invalidateCache(cacheKey, key);

export const batchRequests = <T>(requests: Array<{ id: string; request: () => Promise<T> }>, batchSize?: number) =>
  performance.batchRequests(requests, batchSize);

export const deduplicateRequest = <T>(key: string, request: () => Promise<T>) =>
  performance.deduplicateRequest(key, request);

export const createLazyComponent = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => performance.createLazyComponent(factory, fallback);

export const preloadComponent = (factory: () => Promise<any>) =>
  performance.preloadComponent(factory);

export const preloadCriticalResources = (urls: string[]) =>
  performance.preloadCriticalResources(urls);

export const getCacheStats = () => performance.getCacheStats();