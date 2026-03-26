import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsContents,
} from "@/components/animate-ui/components/tabs";
import {
  Users,
  UserPlus,
  Search,
  User,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react";
import { MainframeStrip } from "@/components/mainframe/MainframeStrip";
import { cn } from "@/lib/utils";

type FriendRow = {
  id: string;
  username: string;
  weeklyCount: number;
  streakDays: number;
  avatarUrl: string | null;
  totalPoints: number;
};

function mergeDevDummyFriends(friends: FriendRow[]): FriendRow[] {
  if (!import.meta.env.DEV) return friends;
  const target = 4;
  if (friends.length >= target) return friends;
  const seeds = [
    { username: "JCLRunner", weeklyCount: 1, streakDays: 4, totalPoints: 890 },
    { username: "VSAMVoyager", weeklyCount: 0, streakDays: 2, totalPoints: 720 },
    { username: "CICSOper", weeklyCount: 3, streakDays: 7, totalPoints: 1020 },
    { username: "BatchJob01", weeklyCount: 0, streakDays: 0, totalPoints: 310 },
  ];
  const out = [...friends];
  const existing = new Set(out.map((f) => f.username));
  let i = 0;
  for (const s of seeds) {
    if (out.length >= target) break;
    if (existing.has(s.username)) continue;
    existing.add(s.username);
    out.push({
      id: `dummy-friend-${i++}`,
      username: s.username,
      weeklyCount: s.weeklyCount,
      streakDays: s.streakDays,
      totalPoints: s.totalPoints,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(s.username)}&size=128`,
    });
  }
  return out;
}

const Friends = () => {
  const profile = useAuthStore((state) => state.profile);
  const {
    friends,
    friendRequests,
    sentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    searchUsers,
    loading: friendsLoading,
    clearError,
    retryConnection,
    lastError,
    realtimeStatus,
  } = useFriendsStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; username: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const displayFriends = useMemo(
    () => mergeDevDummyFriends(friends as FriendRow[]),
    [friends],
  );

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex h-96 items-center justify-center">
          <p>Loading your friends...</p>
        </div>
      </MainLayout>
    );
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const isDummyFriend = (id: string) => id.startsWith("dummy-friend-");

  return (
    <MainLayout>
      <div className="mainframe-page relative space-y-6 animate-fade-in">
        <div className="mainframe-glow-soft-tl" />
        <div className="mainframe-glow-soft-br" />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] text-slate-500 md:text-xs">* LINKAGE SECTION — SOCIAL PROGRAM *</p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">Friends</h1>
            <p className="text-muted-foreground">Manage your friends and stay accountable together.</p>
          </div>
          <Users className="h-8 w-8 shrink-0 text-slate-400" />
        </div>

        <Tabs defaultValue="friends" as any>
          <TabsList className="mb-6 w-full border border-slate-700/40 bg-black/30 p-1">
            <TabsTrigger
              value="friends"
              className="flex-1 font-mono text-xs data-[state=active]:bg-slate-800/80 data-[state=active]:text-slate-100"
            >
              <Users className="mr-2 h-4 w-4" /> Friends ({displayFriends.length})
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="flex-1 font-mono text-xs data-[state=active]:bg-slate-800/80 data-[state=active]:text-slate-100"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Add Friends
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative flex-1 font-mono text-xs data-[state=active]:bg-slate-800/80 data-[state=active]:text-slate-100">
              <User className="mr-2 h-4 w-4" /> Requests ({friendRequests.length})
              {friendRequests.length > 0 && (
                <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-cyan-500/90" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContents>
            <TabsContent value="friends">
              <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden p-0">
                <MainframeStrip variant="muted" left="FRIEND LIST — SYSIN" right={`ROWS=${displayFriends.length}`} />
                <CardContent className="space-y-3 p-4">
                  {friendsLoading ? (
                    <div className="py-6 text-center text-sm text-slate-500">Loading friends...</div>
                  ) : displayFriends.length > 0 ? (
                    displayFriends.map((friend) => {
                      const dummy = isDummyFriend(friend.id);
                      return (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-slate-700/35 bg-black/25 px-3 py-3"
                        >
                          <button
                            type="button"
                            className={cn(
                              "flex min-w-0 flex-1 items-center space-x-3 text-left",
                              dummy ? "cursor-default" : "cursor-pointer hover:opacity-90",
                            )}
                            onClick={() => {
                              if (!dummy) navigate(`/profile/${friend.id}`);
                            }}
                            disabled={dummy}
                          >
                            <Avatar src={friend.avatarUrl} fallback={friend.username} size={40} className="ring-1 ring-slate-600/40" />
                            <div className="min-w-0">
                              <p className="truncate font-mono text-sm font-medium text-slate-200">
                                {friend.username}
                                {dummy && (
                                  <span className="ml-2 text-[10px] font-normal uppercase text-slate-500">demo</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {friend.totalPoints} pts · {friend.streakDays} day streak
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                              onClick={() => {
                                if (!dummy) navigate(`/profile/${friend.id}`);
                              }}
                              disabled={dummy}
                              aria-label={`View ${friend.username}'s profile`}
                            >
                              <User className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/80 disabled:opacity-40"
                              onClick={() => removeFriend(friend.id)}
                              aria-label={`Remove ${friend.username} as friend`}
                              disabled={friendsLoading || dummy}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                      <h3 className="text-lg font-medium text-slate-300">No Friends Yet</h3>
                      <p className="mb-4 text-slate-500">Add friends to see them here and compete on the leaderboard.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add">
              <Card className="mainframe-panel-muted mainframe-card-l-sky overflow-hidden p-0">
                <MainframeStrip variant="muted" left="USER SEARCH — CATALOG" right="FIND" />
                <CardContent className="space-y-6 p-4">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Search by username"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="border-slate-600/50 bg-black/40 font-mono text-sm text-slate-200 placeholder:text-slate-600"
                      />
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || friendsLoading}
                      className="border border-slate-600/50 bg-slate-800/80 font-mono text-xs uppercase tracking-wide text-slate-100 hover:bg-slate-700/80"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {isSearching ? (
                      <div className="py-4 text-center text-slate-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-slate-700/35 bg-black/25 px-3 py-3"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar src={null} fallback={result.username} size={40} className="ring-1 ring-slate-600/40" />
                            <p className="font-mono text-sm font-medium text-slate-200">{result.username}</p>
                          </div>
                          <Button
                            variant={sentRequests.includes(result.id) ? "secondary" : "outline"}
                            size="sm"
                            disabled={friendsLoading || sentRequests.includes(result.id)}
                            onClick={() => sendFriendRequest(result.username)}
                            className="border-slate-600/50 font-mono text-xs"
                          >
                            {sentRequests.includes(result.id) ? (
                              <UserCheck className="mr-2 h-4 w-4" />
                            ) : (
                              <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            {sentRequests.includes(result.id) ? "Request Sent" : "Add Friend"}
                          </Button>
                        </div>
                      ))
                    ) : searchQuery && !isSearching ? (
                      <div className="py-8 text-center">
                        <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                        <h3 className="text-lg font-medium text-slate-300">No results found</h3>
                        <p className="text-slate-500">Try searching for a different username</p>
                      </div>
                    ) : (
                      !searchQuery &&
                      !isSearching && (
                        <div className="py-8 text-center">
                          <Search className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                          <h3 className="text-lg font-medium text-slate-300">Search for friends</h3>
                          <p className="text-slate-500">Enter a username to find and add friends</p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card className="mainframe-panel-muted mainframe-card-l-silver overflow-hidden p-0">
                <MainframeStrip variant="muted" left="PENDING — INPUT QUEUE" right={`CNT=${friendRequests.length}`} />
                <CardContent className="space-y-3 p-4">
                  {friendsLoading ? (
                    <div className="py-4 text-center text-slate-500">Loading requests...</div>
                  ) : friendRequests.length > 0 ? (
                    friendRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-700/35 bg-black/25 px-3 py-3"
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center space-x-3 text-left hover:opacity-90"
                          onClick={() => navigate(`/profile/${request.from.id}`)}
                        >
                          <Avatar src={request.from.avatarUrl} fallback={request.from.username} size={40} className="ring-1 ring-slate-600/40" />
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-slate-200">{request.from.username}</p>
                            <p className="text-xs text-slate-500">wants to be your friend</p>
                          </div>
                        </button>

                        <div className="flex shrink-0 space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={friendsLoading}
                            onClick={() => acceptFriendRequest(request.id)}
                            className="border-slate-600/50 font-mono text-xs text-slate-200"
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={friendsLoading}
                            onClick={() => declineFriendRequest(request.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center">
                      <User className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                      <h3 className="text-lg font-medium text-slate-300">No Friend Requests</h3>
                      <p className="text-slate-500">Friend requests will appear here when someone adds you</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </TabsContents>
        </Tabs>

        {lastError && realtimeStatus === "error" && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-cyan-600/90"
              onClick={() => {
                clearError();
                void retryConnection();
              }}
            >
              Retry realtime
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Friends;
