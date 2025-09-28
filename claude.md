# 🎯 Professional Project Management Instructions for Claude

## 🚀 **SESSION START PROTOCOL** (Required for Every Session)

### **Step 1: Context Loading (First 2 minutes)**
1. **Read `NEXT_SESSION.md`** - Immediate priorities and where to start
2. **Read `PROJECT_STATUS.md`** - Overall project state and completion status
3. **Read `BLOCKERS.md`** - Critical issues preventing progress
4. **Check `CURRENT_FOCUS.md`** - What was being worked on last session

### **Step 2: Quick Status Assessment**
- Check if any critical blockers have been resolved
- Verify deployment status (check Vercel limits)
- Confirm development environment is working
- Review todo list from previous session

## 📋 **CONTINUOUS PROJECT TRACKING**

### **Update Documentation as You Work:**
- **CURRENT_FOCUS.md** - Update with your current tasks and progress
- **BLOCKERS.md** - Add new issues, mark resolved ones
- **project.md** - Tick off completed items from roadmap
- **DEPLOYMENT_STATUS.md** - Update infrastructure changes

### **Before Making Any Code Changes:**
1. **Read existing code** to understand patterns and conventions
2. **Check for linting errors** that might affect your changes
3. **Verify dependencies** are compatible
4. **Plan your approach** and document it in CURRENT_FOCUS.md

### **Quality Standards (Non-Negotiable):**
- ✅ All code must pass TypeScript checking
- ✅ All code must pass ESLint (no `any` types, no unused variables)
- ✅ Follow existing code patterns and conventions
- ✅ Test changes in development before committing
- ✅ Write meaningful commit messages

## 🔄 **SESSION END PROTOCOL** (Required Before Context Limit)

### **Before Ending Your Session:**
1. **Update `CURRENT_FOCUS.md`** - Document what you accomplished
2. **Update `NEXT_SESSION.md`** - Clear priorities for next Claude session
3. **Update `BLOCKERS.md`** - Any new issues or resolved ones
4. **Commit all changes** - Ensure no work is lost
5. **Test critical functionality** - Verify nothing is broken

### **Handoff Documentation:**
- **What was completed** - Specific accomplishments
- **What's in progress** - Partially completed work
- **What's next** - Immediate priorities for next session
- **Any decisions needed** - User input required
- **Technical notes** - Important implementation details

## 🚨 **CRITICAL RULES**

### **Code Quality (Zero Tolerance):**
- **NO `any` types** in production code
- **NO unused variables** or imports
- **NO linting errors** before commits
- **NO breaking changes** without explicit user approval

### **Documentation Requirements:**
- **ALWAYS update project tracking files** when completing tasks
- **DOCUMENT all decisions** and their reasoning
- **EXPLAIN complex implementations** for future reference
- **KEEP handoff notes current** and actionable

### **Professional Workflow:**
- **ONE task at a time** - Complete before starting new work
- **COMMIT frequently** - Don't lose progress
- **TEST thoroughly** - Verify changes work
- **COMMUNICATE clearly** - Document what you're doing

## 📊 **PROJECT TRACKING SYSTEM**

### **Documentation Hierarchy:**
1. **PROJECT_STATUS.md** - Master project state (85% complete overall)
2. **project.md** - Original roadmap with 6 phases
3. **CURRENT_FOCUS.md** - Active session tracking
4. **NEXT_SESSION.md** - Handoff for next Claude
5. **BLOCKERS.md** - Issues preventing progress
6. **DEPLOYMENT_STATUS.md** - Infrastructure tracking

### **Priority Levels:**
- 🔴 **Critical** - Blocks deployment or core functionality
- 🟠 **High** - Limits functionality or development efficiency
- 🟡 **Medium** - Improvement opportunity
- 🟢 **Low** - Future enhancement

### **Current Project State (Quick Reference):**
- **Phase 1-4**: ✅ 100% Complete (Core MVP)
- **Phase 5**: ✅ 95% Complete (Polish & Launch)
- **Phase 6**: 🔄 75% Complete (Enterprise Infrastructure)
- **Critical Blockers**: 2 (Vercel limits, linting errors)
- **Deployment**: 🔴 Blocked (Vercel free tier limit)

## 🛠️ **DEVELOPMENT WORKFLOW**

### **Before Any Code Changes:**
```bash
# 1. Check current status
npm run typecheck
npm run lint

# 2. Start development server if not running
npm run dev

# 3. Make your changes following existing patterns

# 4. Verify changes work
npm run typecheck
npm run lint
npm run build

# 5. Commit with clear message
git add .
git commit -m "Clear description of changes"
```

### **When Adding New Features:**
1. **Check if feature fits existing patterns**
2. **Update relevant documentation**
3. **Consider impact on other features**
4. **Test thoroughly in development**
5. **Update project.md progress tracking**

### **When Fixing Bugs:**
1. **Document the bug in BLOCKERS.md**
2. **Identify root cause**
3. **Fix systematically**
4. **Test fix thoroughly**
5. **Mark resolved in BLOCKERS.md**

## 🎯 **SUCCESS METRICS**

### **Session Success Criteria:**
- ✅ All work properly documented
- ✅ No context lost for next session
- ✅ Code quality maintained
- ✅ Progress toward business goals
- ✅ Clear handoff for continuation

### **Project Success Criteria:**
- ✅ Core MVP: 100% Complete
- ✅ Enterprise Features: 75% Complete → Target 100%
- ✅ Production Deployment: Working
- ✅ User Testing: Beta program launched
- ✅ Business Metrics: Revenue generation

## 🚫 **WHAT NOT TO DO**

### **Never:**
- Work without reading status files first
- Make changes without understanding context
- Commit code that doesn't pass quality checks
- End session without updating handoff documentation
- Create new files unless absolutely necessary
- Break existing functionality
- Leave work in an incomplete state without documentation

### **Always Ask User For:**
- Budget decisions (Vercel Pro upgrade, monitoring services)
- Business strategy decisions (beta testing timeline)
- Major architectural changes
- Deployment platform choices

## 📞 **ESCALATION GUIDELINES**

### **Escalate to User When:**
- Critical decisions needed (budget, platform choice)
- Major blockers require business input
- Technical architecture needs approval
- Timeline or scope changes required

### **Continue Without User When:**
- Code quality improvements
- Documentation updates
- Bug fixes within existing functionality
- Performance optimizations

---

## 💡 **PROFESSIONAL PRINCIPLES**

1. **Quality First** - Never compromise on code quality
2. **Documentation Driven** - Document everything for continuity
3. **User Focused** - Every change should benefit end users
4. **Business Aware** - Understand commercial implications
5. **Systematic Approach** - Follow established processes
6. **Continuous Improvement** - Learn and adapt

**Remember:** The goal is professional, enterprise-grade development with zero context loss between sessions. Follow this system and you'll maintain momentum toward business success.

---

# 📝 **IMPORTANT INSTRUCTION REMINDERS**

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files unless explicitly requested by the User.
When you complete a task from the project plan, update the project.md file so that we can track progress. Tick off any items that have been completed.