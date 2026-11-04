import test from 'node:test';
import assert from 'node:assert/strict';
import { venueReviewLinks } from '../src/lib/venue-review.ts';
test('pending venue links cannot navigate or load media outside approved hosts', () => {
 const good={id:'ABC_123',post_url:'https://www.instagram.com/p/ABC_123/',image_url:'https://scontent.cdninstagram.com/image.jpg'};
 assert.equal(venueReviewLinks(good).postUrl,good.post_url);
 assert.equal(venueReviewLinks(good).imageUrl,good.image_url);
 for(const image_url of ['http://scontent.cdninstagram.com/a','https://scontent.cdninstagram.com.evil.invalid/a','https://user:pass@scontent.cdninstagram.com/a','javascript:alert(1)'])assert.equal(venueReviewLinks({...good,image_url}).imageUrl,null);
 for(const post_url of ['https://evil.invalid/p/ABC_123/','https://www.instagram.com/p/other/','https://www.instagram.com/p/ABC_123/?redirect=elsewhere'])assert.equal(venueReviewLinks({...good,post_url}).postUrl,null);
 assert.equal(venueReviewLinks({...good,id:'../owner'}).postUrl,null);
});
