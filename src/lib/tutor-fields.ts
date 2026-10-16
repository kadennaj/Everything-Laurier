export type TutorAnswers = { display_name: string; course_code: string; course_name: string; term_completed: string; approach: string; experience: string; availability: string; hourly_rate: string; consent: boolean };
export const emptyTutorAnswers: TutorAnswers = {display_name:'',course_code:'',course_name:'',term_completed:'',approach:'',experience:'',availability:'',hourly_rate:'',consent:false};
export const TRANSCRIPT_MAX_BYTES=8*1024*1024;
export function validateTutorAnswers(value: TutorAnswers) {
 const text=(key: keyof TutorAnswers,min: number,max: number,label: string) => {
  const result=String(value[key]).trim();
  if(result.length<min||result.length>max) throw Error(`${label} must be ${min}–${max} characters.`);
  return result;
 };
 const course=value.course_code.toUpperCase().replace(/\s/g,'');
 if(!/^[A-Z]{2,5}[0-9]{3}[A-Z]?$/.test(course))throw Error('Enter a course code such as CP104 or BU111.');
 const rate=Number(value.hourly_rate);
 if(!value.hourly_rate.trim()||!Number.isFinite(rate)||rate<0||rate>200)throw Error('Enter an hourly rate from $0 to $200 CAD.');
 if(!value.consent)throw Error('Confirm private transcript review and the approved listing before submitting.');
 return {display_name:text('display_name',2,80,'Your name'),course_code:course,course_name:text('course_name',3,120,'Course title'),term_completed:text('term_completed',4,80,'Term completed'),approach:text('approach',30,1200,'Your tutoring approach'),experience:text('experience',0,1200,'Your experience'),availability:text('availability',5,400,'Availability'),hourly_rate:rate,consent:true};
}
export function validateTranscript(bytes: Uint8Array) {
 if(!bytes.byteLength||bytes.byteLength>TRANSCRIPT_MAX_BYTES) throw Error('Choose a transcript image smaller than 8 MB.');
 if(bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)throw Error('The transcript must be a JPEG image. Choose the image again.');
}
