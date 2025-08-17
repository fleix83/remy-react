#!/usr/bin/env node

/**
 * Claude Update Command
 * Analyzes current project status and generates comprehensive update report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.updateDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Analyze project structure and files
  analyzeProject() {
    const analysis = {
      date: this.updateDate,
      stats: this.getProjectStats(),
      completedFeatures: this.analyzeCompletedFeatures(),
      recentChanges: this.getRecentChanges(),
      technicalHealth: this.assessTechnicalHealth(),
      recommendations: this.generateRecommendations()
    };

    return analysis;
  }

  // Get basic project statistics
  getProjectStats() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      
      // Count files in key directories
      const srcFiles = this.countFiles('src');
      const componentFiles = this.countFiles('src/components');
      const serviceFiles = this.countFiles('src/services');
      const storeFiles = this.countFiles('src/stores');

      return {
        projectName: packageJson.name,
        version: packageJson.version,
        srcFiles,
        componentFiles,
        serviceFiles,
        storeFiles,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length
      };
    } catch (error) {
      return { error: 'Could not analyze project stats' };
    }
  }

  // Count files in directory recursively
  countFiles(dirPath) {
    try {
      const fullPath = path.join(this.projectRoot, dirPath);
      if (!fs.existsSync(fullPath)) return 0;
      
      const files = fs.readdirSync(fullPath, { recursive: true });
      return files.filter(file => 
        typeof file === 'string' && 
        (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))
      ).length;
    } catch {
      return 0;
    }
  }

  // Analyze completed features based on file existence
  analyzeCompletedFeatures() {
    const features = {
      authentication: this.checkFiles(['src/stores/auth.store.ts', 'src/components/auth/']),
      forum: this.checkFiles(['src/components/forum/', 'src/stores/forum.store.ts']),
      messaging: this.checkFiles(['src/components/messaging/', 'src/stores/messages.store.ts']),
      moderation: this.checkFiles(['src/components/admin/', 'src/services/moderation.service.ts']),
      therapists: this.checkFiles(['src/components/therapist/', 'src/services/therapists.service.ts']),
      notifications: this.checkFiles(['src/stores/notifications.store.ts']),
      userBlocking: this.checkFiles(['src/services/user-blocks.service.ts'])
    };

    return features;
  }

  // Check if files/directories exist
  checkFiles(filePaths) {
    return filePaths.every(filePath => {
      const fullPath = path.join(this.projectRoot, filePath);
      return fs.existsSync(fullPath);
    });
  }

  // Get recent git changes
  getRecentChanges() {
    try {
      const recentCommits = execSync('git log --oneline -10', { encoding: 'utf8' });
      const lastCommitDate = execSync('git log -1 --format="%ad" --date=short', { encoding: 'utf8' }).trim();
      
      return {
        lastCommitDate,
        recentCommits: recentCommits.split('\n').filter(line => line.trim()).slice(0, 5)
      };
    } catch {
      return { error: 'Could not access git information' };
    }
  }

  // Assess technical health
  assessTechnicalHealth() {
    const health = {
      typescript: this.checkFiles(['tsconfig.json']),
      buildSystem: this.checkFiles(['vite.config.ts']),
      testing: this.checkFiles(['vitest.config.ts', 'src/**/*.test.ts']),
      linting: this.checkFiles(['eslint.config.js', '.eslintrc.js']),
      documentation: this.checkFiles(['README.md', 'CLAUDE.md']),
      deployment: this.checkFiles(['dist/', 'build/'])
    };

    const score = Object.values(health).filter(Boolean).length;
    const maxScore = Object.keys(health).length;
    
    return {
      ...health,
      score: `${score}/${maxScore}`,
      percentage: Math.round((score / maxScore) * 100)
    };
  }

  // Generate specific recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Check for common missing features
    if (!this.checkFiles(['src/components/messaging/MessagingSettings.tsx'])) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Implement Messaging Preferences',
        effort: '2-3 hours',
        description: 'Add user settings for messaging preferences'
      });
    }

    if (!this.checkFiles(['src/**/*.test.ts', 'src/**/*.test.tsx'])) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Add Test Suite',
        effort: '8-12 hours',
        description: 'Implement comprehensive testing with Vitest'
      });
    }

    if (!this.checkFiles(['public/sw.js'])) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Implement Push Notifications',
        effort: '4-6 hours',
        description: 'Add service worker for push notifications'
      });
    }

    return recommendations;
  }

  // Generate the complete update report
  generateReport() {
    const analysis = this.analyzeProject();
    
    const report = `# Remy React Forum - Project Update

## 📊 Project Status Report
**Generated:** ${analysis.date}
**Project:** ${analysis.stats.projectName} v${analysis.stats.version}

---

## 📈 **Project Statistics**
- **Source Files:** ${analysis.stats.srcFiles} files
- **Components:** ${analysis.stats.componentFiles} files
- **Services:** ${analysis.stats.serviceFiles} files
- **Stores:** ${analysis.stats.storeFiles} files
- **Dependencies:** ${analysis.stats.dependencies} production + ${analysis.stats.devDependencies} dev

---

## ✅ **Feature Completion Status**

${Object.entries(analysis.completedFeatures).map(([feature, completed]) => 
  `- ${completed ? '✅' : '❌'} **${feature.charAt(0).toUpperCase() + feature.slice(1)}**`
).join('\n')}

---

## 🔧 **Technical Health: ${analysis.technicalHealth.percentage}%**

${Object.entries(analysis.technicalHealth).filter(([key]) => key !== 'score' && key !== 'percentage').map(([aspect, status]) => 
  `- ${status ? '✅' : '❌'} **${aspect.charAt(0).toUpperCase() + aspect.slice(1)}**`
).join('\n')}

---

## 📋 **Priority Recommendations**

${analysis.recommendations.map(rec => 
  `### ${rec.priority === 'HIGH' ? '🔥' : rec.priority === 'MEDIUM' ? '🟡' : '🟢'} ${rec.title}
- **Priority:** ${rec.priority}
- **Effort:** ${rec.effort}
- **Description:** ${rec.description}
`).join('\n')}

---

## 🚀 **Recent Changes**
**Last Commit:** ${analysis.recentChanges.lastCommitDate || 'Unknown'}

${analysis.recentChanges.recentCommits ? 
  analysis.recentChanges.recentCommits.map(commit => `- ${commit}`).join('\n') : 
  'Could not retrieve recent commits'
}

---

## 🎯 **Next Steps**

### Immediate (This Week):
1. Address HIGH priority recommendations
2. Review and update documentation
3. Plan next development sprint

### Short Term (2-4 weeks):
1. Implement MEDIUM priority features
2. Enhance testing coverage
3. Performance optimization

### Long Term (1-3 months):
1. Advanced features and integrations
2. User feedback implementation
3. Scaling and optimization

---

*Report generated by Claude Update Command*  
*Next update recommended: Weekly during active development*
`;

    return report;
  }
}

// Main execution
function main() {
  console.log('🤖 Claude Update Command - Analyzing project status...\n');
  
  const analyzer = new ProjectAnalyzer();
  const report = analyzer.generateReport();
  
  // Write report to file
  const reportPath = path.join(process.cwd(), 'PROJECT_UPDATE.md');
  fs.writeFileSync(reportPath, report);
  
  console.log('✅ Project update complete!');
  console.log(`📄 Report saved to: ${reportPath}`);
  console.log('\n' + '='.repeat(60));
  console.log(report);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ProjectAnalyzer };