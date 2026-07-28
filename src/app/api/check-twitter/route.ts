import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get("username") || "";
  username = username.trim().replace(/^@/, "");
  
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const apiKey = "new1_11159716a5c644a7af4d58d8357a36c2";
    // Search query: from:username (variational OR @variational_io)
    // Standard twitter search is case-insensitive.
    const queryStr = `from:${username} (variational OR @variational_io)`;
    const targetUrl = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(queryStr)}&queryType=Latest`;
    
    const res = await fetch(targetUrl, {
      headers: {
        "X-API-Key": apiKey,
        "Accept": "application/json"
      }
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch tweets (Status: ${res.status})` }, { status: res.status });
    }

    const data = await res.json();
    const tweets = data.tweets || [];

    let totalViews = 0;
    let totalLikes = 0;
    let totalRetweets = 0;
    let matchingTweetsCount = 0;

    for (const t of tweets) {
      // Exclude replies explicitly (either by field or starting with @ in text)
      if (t.isReply === true || t.inReplyToUserId || (t.text && t.text.trim().startsWith("@"))) {
        continue;
      }

      const textLower = (t.text || "").toLowerCase();
      const articleTitleLower = (t.article?.title || "").toLowerCase();
      const articlePreviewLower = (t.article?.preview_text || "").toLowerCase();
      
      // Check if it mentions @variational_io, variational_io or variational
      if (
        textLower.includes("variational") ||
        articleTitleLower.includes("variational") ||
        articlePreviewLower.includes("variational")
      ) {
        matchingTweetsCount++;
        totalViews += Number(t.viewCount || 0);
        totalLikes += Number(t.likeCount || 0);
        totalRetweets += Number(t.retweetCount || 0);
      }
    } 

    // Engagement rate
    const engagementRate = totalViews > 0 ? (totalLikes + totalRetweets) / totalViews : 0;

    // Calculate extra points based on:
    // - < 5 000 views -> 0
    // - 5k - 20k, >=3 tweets, >=1% engagement -> +5 - 15 points
    // - 20k - 80k, >=5 tweets, >=1% engagement -> +20 - 40 points
    // - 80k - 300k, >=8 tweets, >=0.8% engagement -> +50 - 100 points
    // - > 300k, >=10 tweets, >=0.7% engagement -> +120 - 250 points
    let extraPoints = 0;
    if (totalViews >= 300000 && matchingTweetsCount >= 10 && engagementRate >= 0.007) {
      extraPoints = Math.min(250, 120 + ((totalViews - 300000) / 700000) * 130);
    } else if (totalViews >= 80000 && matchingTweetsCount >= 8 && engagementRate >= 0.008) {
      extraPoints = 50 + ((totalViews - 80000) / 220000) * 50;
    } else if (totalViews >= 20000 && matchingTweetsCount >= 5 && engagementRate >= 0.01) {
      extraPoints = 20 + ((totalViews - 20000) / 60000) * 20;
    } else if (totalViews >= 5000 && matchingTweetsCount >= 3 && engagementRate >= 0.01) {
      extraPoints = 5 + ((totalViews - 5000) / 15000) * 10;
    }

    extraPoints = Math.round(extraPoints);

    return NextResponse.json({
      username,
      matchingTweetsCount,
      totalViews,
      totalLikes,
      totalRetweets,
      engagementRate,
      extraPoints,
    });
  } catch (error) {
    console.error("Twitter check error:", error);
    return NextResponse.json({ error: "Internal server error during Twitter verification" }, { status: 500 });
  }
}
