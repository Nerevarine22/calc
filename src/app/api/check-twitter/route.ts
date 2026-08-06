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
    const queryStr = `from:${username} (variational OR @variational_io) -filter:replies`;
    
    let cursor = "";
    let pageCount = 0;
    const maxPages = 5; // Up to 100 tweets depth (5 pages x 20 results)
    const tweets: any[] = [];

    while (pageCount < maxPages) {
      let targetUrl = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(queryStr)}&queryType=Latest`;
      if (cursor) {
        targetUrl += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const res = await fetch(targetUrl, {
        headers: {
          "X-API-Key": apiKey,
          "Accept": "application/json"
        }
      });

      if (!res.ok) {
        if (tweets.length > 0) break; // Use whatever we fetched so far if API errors on later page
        return NextResponse.json({ error: `Failed to fetch tweets (Status: ${res.status})` }, { status: res.status });
      }

      const data = await res.json();
      const pageTweets = data.tweets || [];
      tweets.push(...pageTweets);

      if (data.has_next_page && data.next_cursor && pageTweets.length > 0) {
        cursor = data.next_cursor;
        pageCount++;
      } else {
        break;
      }
    }

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

    // Calculate bonus percentage based on reach and engagement:
    // - < 5 000 views -> 0%
    // - 5k - 20k views, >=3 tweets, >=0.5% engagement -> 3%
    // - 20k - 80k views, >=5 tweets, >=0.5% engagement -> 5%
    // - 80k - 300k views, >=8 tweets, >=0.5% engagement -> 7%
    // - > 300k views, >=10 tweets, >=0.5% engagement -> 10%
    let bonusPct = 0;
    if (totalViews >= 300000 && matchingTweetsCount >= 10 && engagementRate >= 0.005) {
      bonusPct = 0.10;
    } else if (totalViews >= 80000 && matchingTweetsCount >= 8 && engagementRate >= 0.005) {
      bonusPct = 0.07;
    } else if (totalViews >= 20000 && matchingTweetsCount >= 5 && engagementRate >= 0.005) {
      bonusPct = 0.05;
    } else if (totalViews >= 5000 && matchingTweetsCount >= 3 && engagementRate >= 0.005) {
      bonusPct = 0.03;
    }

    return NextResponse.json({
      username,
      matchingTweetsCount,
      totalViews,
      totalLikes,
      totalRetweets,
      engagementRate,
      bonusPct,
    });
  } catch (error) {
    console.error("Twitter check error:", error);
    return NextResponse.json({ error: "Internal server error during Twitter verification" }, { status: 500 });
  }
}
