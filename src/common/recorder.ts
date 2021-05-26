import { prepProp } from './property-file-management'

export function prepRecorderProps () {
  // Shared state filter (picked up from configuration if exists)
  prepProp('Recorder_Use', 'YES', '------------------------\n' +
        '#  RECORDER\n' +
        '# ------------------------\n' +
        '# The recorder allows you to store executed tcli commands into an (executable) file, so you can replay these commands.\n' +
        '# Do you want to use the recorder; this enables the display or replay commands.\n' +
        '#  Note: this does not mean that you are recoding directly (YES | NO)')
  prepProp('Recorder_Do_Record_From_Start', 'NO', 'Setting to record from loading (YES | NO)\n' +
        '# Note: you can also start and stop recording with the start-recording and stop-recording command.')
  prepProp('Recorder_File_To_Record_To', 'tcli-recordings.sh', 'File that you want your recordings to go to')
}
