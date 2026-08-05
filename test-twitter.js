const https = require('https');

async function checkTwitter(username) {
  const apiKey = "new1_11159716a5c644a7af4d58d8357a36c2";
  const queryStr = `from:${username} (variational OR @variational_io)`;
  const targetUrl = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(queryStr)}&queryType=Top`;
  
  console.log("Fetching:", targetUrl);
  
  const response = await fetch(targetUrl, {
    headers: {
      "X-API-Key": apiKey,
      "Accept": "application/json"
    }
  });
  
  const data = await response.json();
  console.log("Response status:", response.status);
  
  if (!data.tweets) {
    console.log("No tweets in response. Data keys:", Object.keys(data));
    console.log(data);
    return;
  }
  
  console.log(`Found ${data.tweets.length} tweets from search API.`);
  
  let totalViews = 0;
  let totalLikes = 0;
  let totalRetweets = 0;
  let matchingTweetsCount = 0;

  for (const t of data.tweets) {
    console.log(`\n--- TWEET ID ${t.id} ---`);
    console.log("Text:", t.text?.substring(0, 50) + "...");
    console.log("isReply:", t.isReply, "inReplyToUserId:", t.inReplyToUserId);
    console.log("Views:", t.viewCount, "Likes:", t.likeCount, "Retweets:", t.retweetCount);
    
    if (t.isReply === true || t.inReplyToUserId || (t.text && t.text.trim().startsWith("@"))) {
      console.log("-> SKIPPED (is reply)");
      continue;
    }

    const textLower = (t.text || "").toLowerCase();
    const articleTitleLower = (t.article?.title || "").toLowerCase();
    const articlePreviewLower = (t.article?.preview_text || "").toLowerCase();
    
    if (
      textLower.includes("variational") ||
      articleTitleLower.includes("variational") ||
      articlePreviewLower.includes("variational")
    ) {
      console.log("-> MATCHED!");
      matchingTweetsCount++;
      totalViews += Number(t.viewCount || 0);
      totalLikes += Number(t.likeCount || 0);
      totalRetweets += Number(t.retweetCount || 0);
    } else {
      console.log("-> SKIPPED (no 'variational' in text)");
    }
  } 

  const engagementRate = totalViews > 0 ? (totalLikes + totalRetweets) / totalViews : 0;
  
  console.log("\n=== FINAL STATS ===");
  console.log("Matching Tweets:", matchingTweetsCount);
  console.log("Total Views:", totalViews);
  console.log("Total Likes:", totalLikes);
  console.log("Total Retweets:", totalRetweets);
  console.log("Engagement Rate:", engagementRate.toFixed(4));
}

checkTwitter('0xBaseee').catch(console.error);
