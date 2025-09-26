// Performance monitoring utility for tracking database query performance

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  success: boolean
  error?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics

  // Track a database operation
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    const timestamp = Date.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      
      this.addMetric({
        operation,
        duration,
        timestamp,
        success: true
      })
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`🐌 Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      this.addMetric({
        operation,
        duration,
        timestamp,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      console.error(`❌ Operation failed: ${operation} failed after ${duration.toFixed(2)}ms`, error)
      throw error
    }
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  // Get performance statistics
  getStats(operation?: string) {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics

    if (filteredMetrics.length === 0) {
      return null
    }

    const durations = filteredMetrics.map(m => m.duration)
    const successCount = filteredMetrics.filter(m => m.success).length
    const errorCount = filteredMetrics.length - successCount

    return {
      operation: operation || 'all',
      totalOperations: filteredMetrics.length,
      successRate: (successCount / filteredMetrics.length) * 100,
      errorCount,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.percentile(durations, 95),
      slowOperations: filteredMetrics.filter(m => m.duration > 1000).length
    }
  }

  // Get all unique operations
  getOperations(): string[] {
    const operations = new Set(this.metrics.map(m => m.operation))
    return Array.from(operations).sort()
  }

  // Print performance report
  printReport() {
    console.group('📊 Performance Report')
    
    const overallStats = this.getStats()
    if (overallStats) {
      console.log('Overall Performance:', overallStats)
    }
    
    console.log('\nPer-Operation Stats:')
    this.getOperations().forEach(operation => {
      const stats = this.getStats(operation)
      if (stats) {
        console.log(`${operation}:`, stats)
      }
    })
    
    console.groupEnd()
  }

  // Clear metrics
  clear() {
    this.metrics = []
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.slice().sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index]
  }

  // Monitor React Query operations
  setupReactQueryMonitoring(queryClient: any) {
    const originalQuery = queryClient.getQueryData
    const originalMutate = queryClient.mutateAsync

    // Monitor queries
    queryClient.getQueryData = (...args: any[]) => {
      const queryKey = args[0]
      const operation = `query:${Array.isArray(queryKey) ? queryKey.join(':') : queryKey}`
      
      return this.trackOperation(operation, () => originalQuery.apply(queryClient, args))
    }

    console.log('🔍 React Query performance monitoring enabled')
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Helper function to wrap service methods with performance tracking
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return ((...args: any[]) => {
    return performanceMonitor.trackOperation(operationName, () => fn(...args))
  }) as T
}

// Development helper to expose performance monitor globally
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).performanceMonitor = performanceMonitor
  console.log('🔧 Performance monitor available at window.performanceMonitor')
}