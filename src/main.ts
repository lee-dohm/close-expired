import * as core from '@actions/core'
import * as fs from 'fs'
import * as util from 'util'

import Issue from './issue'

const readFile = util.promisify(fs.readFile)

async function run(): Promise<void> {
  try {
    const issuesPath = core.getInput('path', { required: true })
    const issuesList = (await readFile(issuesPath)).toString()
    const issueUrls = issuesList.split('\n')

    for (const issueUrl of issueUrls) {
      const issue = await Issue.fromUrl(issueUrl)

      if (issue.isExpired()) {
        await issue.close()
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
