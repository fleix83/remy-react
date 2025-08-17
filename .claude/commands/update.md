# /update - Project Resume & Status Analysis

## Summary
Token-efficient command to resume work on any project by analyzing CLAUDE.md, git status, and codebase structure to provide current context and actionable next steps.

## Command
```javascript
// Read project documentation if available
const claudeMdExists = await fileExists('CLAUDE.md');
const claudeMd = claudeMdExists ? await read('CLAUDE.md') : '';

// Get git information
const gitStatus = await bash('git status --porcelain');
const recentCommits = await bash('git log --oneline -5');
const currentBranch = await bash('git branch --show-current');

// Check for common project files
const packageJsonExists = await fileExists('package.json');
const packageJson = packageJsonExists ? JSON.parse(await read('package.json')) : null;
const readmeExists = await fileExists('README.md');

// Parse project status from CLAUDE.md if available
if (claudeMd) {
  const statusMatch = claudeMd.match(/(?:Current Status|Status):\s*(.+?)(?:\n|$)/i);
  const currentStatus = statusMatch ? statusMatch[1].replace(/[✅🚧⏳]/g, '').trim() : 'Unknown';
  
  // Extract completion phases/sections
  const completedSections = [...claudeMd.matchAll(/✅.*?([A-Z][^-\n]+)/g)].map(m => m[1].trim());
  const inProgressSections = [...claudeMd.matchAll(/🚧.*?([A-Z][^-\n]+)/g)].map(m => m[1].trim());
  const pendingSections = [...claudeMd.matchAll(/❌.*?([A-Z][^-\n]+)/g)].map(m => m[1].trim());
  
  // Extract next steps/priorities
  const nextStepsMatch = claudeMd.match(/(?:Next Steps|High Priority|What's Missing)[\s\S]*?(?:###|##|$)/i);
  const nextSteps = nextStepsMatch ? 
    [...nextStepsMatch[0].matchAll(/\d+\.\s*\*\*([^*]+)\*\*/g)].map(m => m[1]) : 
    [...(nextStepsMatch?.[0] || '').matchAll(/[-*]\s*([^\n]+)/g)].map(m => m[1]);

  console.log(`# 📋 Project Resume: ${packageJson?.name || 'Current Project'}

## 📊 Status: ${currentStatus}

### ✅ Completed (${completedSections.length}):
${completedSections.slice(0, 5).map(s => `- ${s}`).join('\n')}${completedSections.length > 5 ? '\n- ...' : ''}

### 🚧 In Progress (${inProgressSections.length}):
${inProgressSections.map(s => `- ${s}`).join('\n')}

### 📋 Priority Next Steps:
${nextSteps.slice(0, 4).map((step, i) => `${i + 1}. ${step}`).join('\n')}

### 🔄 Git Status:
- Branch: ${currentBranch}
- Uncommitted: ${gitStatus.trim() ? gitStatus.split('\n').length + ' files' : 'Clean'}
- Recent: ${recentCommits.split('\n')[0]}

💡 **Ready to continue!** What would you like to work on?`);
} else {
  // Fallback for projects without CLAUDE.md
  const projectType = packageJson ? 
    (packageJson.dependencies?.react ? 'React' :
     packageJson.dependencies?.vue ? 'Vue' :
     packageJson.dependencies?.express ? 'Node.js' : 'JavaScript') + ' Project' :
    'Unknown Project Type';

  console.log(`# 📋 Project Resume: ${packageJson?.name || 'Current Project'}

## 📊 Project Type: ${projectType}

### 🔄 Git Status:
- Branch: ${currentBranch}
- Uncommitted: ${gitStatus.trim() ? gitStatus.split('\n').length + ' files' : 'Clean'}
- Recent commits:
${recentCommits}

### 📂 Project Structure:
${packageJson ? `- Package: ${packageJson.name}@${packageJson.version}` : ''}
${readmeExists ? '- README.md available' : ''}
- Git repository: Active

### 💡 Recommendations:
1. **Create CLAUDE.md** - Document project status and goals for better context
2. **Review recent changes** - Check what was worked on last
3. **Identify next priorities** - What features or fixes are needed?

🚀 **Let me know what you'd like to work on!**`);
}
```

## Usage
- `/update` - Analyze any project and provide resume context
- Works with or without CLAUDE.md documentation
- Adapts output based on available project information
- Provides actionable next steps regardless of project type

## Benefits
- **Universal** - Works across any codebase/technology
- **Contextual** - Adapts to available project documentation
- **Efficient** - Single command provides full project context  
- **Actionable** - Always provides clear next steps