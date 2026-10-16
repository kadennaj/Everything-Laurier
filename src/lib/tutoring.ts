import { supabase } from './supabase';
import { TutorAnswers, validateTutorAnswers, validateTranscript } from './tutor-fields';
export type ApplicationStatus='draft'|'pending'|'approved'|'rejected'|'withdrawn';
export type TutorApplication={id:string;user_id:string;display_name:string;contact_email:string;course_code:string;course_name:string;term_completed:string;approach:string;experience:string;availability:string;hourly_rate:number;transcript_path:string;status:ApplicationStatus;review_note:string;created_at:string;reviewed_at:string|null};
export type TutorListing=Pick<TutorApplication,'id'|'display_name'|'contact_email'|'course_code'|'course_name'|'approach'|'availability'|'hourly_rate'>;
export type ContentReport={id:string;reason:string;status:string;created_at:string;profile_id:string|null;post_id:string|null;tutor_application_id:string|null;display_name:string|null;program:string|null;bio:string|null;profile_status:string|null;caption:string|null;image_url:string|null;post_url:string|null;source_username:string|null;post_status:string|null};
export async function tutorRequest<T>(action:string,payload:object={}):Promise<T> {
 if(!supabase)throw Error('Tutoring is unavailable. Please try again later.');
 const {data,error}=await supabase.rpc('tutor_portal',{p_action:action,p_payload:payload});
 if(error)throw Error(error.code==='23505'?'You already have an active application for this course. Check My applications.':error.code==='42501'?'Sign in again to continue.':'The application could not be saved. Check your connection and try again.');
 return data as T;
}
export async function ownerRequest<T>(action:string,payload:object={}):Promise<T> {
 if(!supabase)throw Error('Owner tools are unavailable.');
 const {data,error}=await supabase.rpc('owner_portal',{p_action:action,p_payload:payload});
 if(error)throw Error(error.code==='42501'?'This dashboard is restricted to the owner.':'The review could not finish. Refresh the queue before trying again.');
 return data as T;
}
export const createTutorDraft=(answers:TutorAnswers)=>tutorRequest<TutorApplication>('create',validateTutorAnswers(answers));
export async function submitTutorDraft(application:TutorApplication,bytes:Uint8Array) {
 validateTranscript(bytes);
 if(!supabase)throw Error('Uploads are unavailable.');
 const {error}=await supabase.storage.from('tutor-transcripts').upload(application.transcript_path,bytes.buffer as ArrayBuffer,{contentType:'image/jpeg',upsert:false,cacheControl:'0'});
 if(error && !['409','Duplicate'].includes(error.statusCode??''))throw Error('The transcript upload failed. Your draft is saved; retry with the same image.');
 return tutorRequest<TutorApplication>('submit',{id:application.id});
}
export async function withdrawApplication(application:TutorApplication) {
 await tutorRequest('withdraw',{id:application.id});
 const {error}=await supabase!.storage.from('tutor-transcripts').remove([application.transcript_path]);
 if(error)throw Error('Your listing is withdrawn. Image removal will be retried by the daily cleanup.');
}
export async function transcriptUrl(path:string) {
 if(!supabase)throw Error('Transcript review unavailable.');
 const {data,error}=await supabase.storage.from('tutor-transcripts').createSignedUrl(path,60);
 if(error||!data)throw Error('This transcript could not be opened. It may have expired or been removed.');
 return data.signedUrl;
}
