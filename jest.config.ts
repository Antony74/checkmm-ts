import { createDefaultPreset, type JestConfigWithTsJest } from 'ts-jest'

const presetConfig = createDefaultPreset({
})

const jestConfig: JestConfigWithTsJest = {
  ...presetConfig,
}

export default jestConfig