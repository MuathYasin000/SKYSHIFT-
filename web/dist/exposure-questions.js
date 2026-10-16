import {skyToPixel} from './science.js';

export const MAX_EXPOSURE_QUESTIONS=16,MAX_QUESTION_LENGTH=1500;
const keys=['id','product_sha256','frame','ra_deg','dec_deg','question','created_at'].sort();

// Questions express user interpretation. Their position must refer to a usable measured pixel.
export function validateExposureQuestions(questions,product,productSha,valid){
  if(!Array.isArray(questions)||questions.length>MAX_EXPOSURE_QUESTIONS)throw Error('Keep at most 16 questions per exposure.');
  const ids=new Set(),[h,w]=product.shape;
  if(!valid||valid.length!==h*w)throw Error('Question validation requires the verified quality mask.');
  return questions.map(q=>{
    if(!q||typeof q!=='object'||Object.keys(q).sort().join('|')!==keys.join('|')||typeof q.id!=='string'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(q.id)||ids.has(q.id)||q.product_sha256!==productSha||q.frame!=='icrs')throw Error('Question identity does not match this exposure.');
    if(typeof q.question!=='string'||!q.question.trim()||q.question.length>MAX_QUESTION_LENGTH||!Number.isFinite(q.ra_deg)||q.ra_deg<0||q.ra_deg>=360||!Number.isFinite(q.dec_deg)||Math.abs(q.dec_deg)>90||typeof q.created_at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(q.created_at)||!Number.isFinite(Date.parse(q.created_at)))throw Error('Invalid question text, sky position or timestamp.');
    if(new Date(q.created_at).toISOString()!==q.created_at)throw Error('Invalid question timestamp.');
    const point=skyToPixel(q.ra_deg,q.dec_deg,product.wcs),x=Math.round(point.x),y=Math.round(point.y);
    if(x<0||y<0||x>=w||y>=h||!valid[y*w+x])throw Error('Choose a usable pixel inside this exposure. Blue gaps cannot support a measurement.');
    ids.add(q.id);return {...q};
  });
}
