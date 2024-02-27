import { execSync } from 'child_process'

const version = process.argv[2]
if (!version) {
  throw new Error('Missing version argument')
}


const gitStatus = execSync('git status ./ --porcelain').toString().trim()
const isClean = gitStatus  === ''
if (!isClean) {
  throw new Error('Working tree is not clean')
}

try {
  // 去除 link
  execSync('npm install')
  execSync('npm run build')
  const newVersion = execSync(`npm version ${version}`)
  execSync('git push')
  execSync(`npm publish ./`)
} catch (e) {
  console.error(e)
  process.exit(1)
}
