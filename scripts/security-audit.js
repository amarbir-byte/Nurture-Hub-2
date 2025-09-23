import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('🔒 Starting Security Audit for Nurture Hub')
console.log('=' .repeat(50))

// 1. NPM Audit for vulnerabilities
console.log('\n1. Checking for known vulnerabilities...')
try {
  execSync('npm audit --audit-level=high', { stdio: 'pipe' })
  console.log('✅ No high-severity vulnerabilities found')
} catch (error) {
  console.log('⚠️  Found vulnerabilities:')
  console.log(error.stdout.toString())
}

// 2. Check for exposed secrets
console.log('\n2. Scanning for potential secrets...')
const secretPatterns = [
  /SUPABASE_ANON_KEY.*=.*[^env]/i,
  /STRIPE_PUBLISHABLE_KEY.*=.*[^env]/i,
  /password.*=.*["'][^"']*["']/i,
  /secret.*=.*["'][^"']*["']/i,
  /key.*=.*["'][^"']*["']/i,
  /token.*=.*["'][^"']*["']/i
]

const scanDirectory = (dir) => {
  const files = fs.readdirSync(dir, { withFileTypes: true })

  for (const file of files) {
    const fullPath = path.join(dir, file.name)

    if (file.isDirectory() && !['node_modules', '.git', 'dist'].includes(file.name)) {
      scanDirectory(fullPath)
    } else if (file.isFile() && ['.ts', '.tsx', '.js', '.jsx', '.env'].some(ext => file.name.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, 'utf8')

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          console.log(`⚠️  Potential secret found in ${fullPath}`)
        }
      }
    }
  }
}

try {
  scanDirectory('./src')
  console.log('✅ Secret scan completed')
} catch (error) {
  console.log('❌ Error during secret scan:', error.message)
}

// 3. Check environment variables setup
console.log('\n3. Checking environment variable configuration...')
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY'
]

const envExample = fs.existsSync('.env.example')
const envLocal = fs.existsSync('.env.local')

if (envExample) {
  console.log('✅ .env.example file found')
} else {
  console.log('⚠️  .env.example file missing')
}

if (envLocal) {
  console.log('✅ .env.local file found')

  const envContent = fs.readFileSync('.env.local', 'utf8')
  for (const envVar of requiredEnvVars) {
    if (envContent.includes(envVar)) {
      console.log(`✅ ${envVar} configured`)
    } else {
      console.log(`❌ ${envVar} missing`)
    }
  }
} else {
  console.log('❌ .env.local file missing')
}

// 4. Check for secure headers in vite config
console.log('\n4. Checking security configuration...')
const viteConfigExists = fs.existsSync('vite.config.ts')
if (viteConfigExists) {
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8')

  if (viteConfig.includes('maximumFileSizeToCacheInBytes')) {
    console.log('✅ Cache size limits configured')
  } else {
    console.log('⚠️  Consider adding cache size limits')
  }

  if (viteConfig.includes('NetworkOnly')) {
    console.log('✅ Stripe API configured as NetworkOnly (secure)')
  } else {
    console.log('⚠️  Stripe API caching should be NetworkOnly')
  }
}

// 5. Check for HTTPS enforcement
console.log('\n5. Checking HTTPS configuration...')
if (fs.existsSync('vercel.json')) {
  const vercelConfig = fs.readFileSync('vercel.json', 'utf8')
  if (vercelConfig.includes('https')) {
    console.log('✅ HTTPS enforcement found in vercel.json')
  } else {
    console.log('⚠️  Consider adding HTTPS enforcement')
  }
} else {
  console.log('ℹ️  No vercel.json found (will be created for deployment)')
}

console.log('\n🔒 Security audit completed!')
console.log('Recommendations:')
console.log('- Always use environment variables for secrets')
console.log('- Enable HTTPS in production')
console.log('- Regularly update dependencies')
console.log('- Use Content Security Policy headers')
console.log('- Implement rate limiting on API endpoints')