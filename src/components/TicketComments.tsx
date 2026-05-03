'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CommentUser {
  email: string;
  name: string | null;
}

interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  user: CommentUser | CommentUser[] | null;
}

interface TicketCommentsProps {
  issueId: string;
}

// Helper to normalize user data from various Supabase response formats
function getUserDisplayName(user: CommentUser | CommentUser[] | null): string {
  if (!user) return 'Unknown';
  if (Array.isArray(user)) {
    const firstUser = user[0];
    return firstUser?.name || firstUser?.email || 'Unknown';
  }
  return user.name || user.email || 'Unknown';
}

function getUserInitial(user: CommentUser | CommentUser[] | null): string {
  return getUserDisplayName(user).charAt(0).toUpperCase();
}

export function TicketComments({ issueId }: TicketCommentsProps) {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  // Determine if current user is BRAC staff
  const isBracStaff = userProfile?.role
    ? ['admin', 'manager', 'resolver', 'reporter'].includes(
        (userProfile.role as string).toLowerCase()
      )
    : false;

  // Fetch comments on component mount or when issueId changes
  useEffect(() => {
    fetchComments();
  }, [issueId]);

  const fetchComments = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          id,
          issue_id,
          user_id,
          content,
          is_internal,
          created_at,
          user:user_id(email, name)
        `
        )
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setComments((data as Comment[]) || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast({
        description: 'Please enter a comment',
      });
      return;
    }

    try {
      setIsLoadingSubmit(true);

      const { error } = await supabase.from('comments').insert({
        issue_id: issueId,
        user_id: user?.id,
        content: newComment,
        is_internal: isBracStaff ? isInternal : false,
      });

      if (error) {
        throw error;
      }

      // Reset form and fetch updated comments
      setNewComment('');
      setIsInternal(false);
      await fetchComments();

      toast({
        title: 'Success',
        description: 'Comment posted successfully',
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  if (isFetching) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments & Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments Thread */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border transition-colors ${
                  comment.is_internal
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getUserInitial(comment.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getUserDisplayName(comment.user)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {comment.is_internal && (
                    <Badge variant="outline" className="ml-2 flex-shrink-0 bg-amber-100 text-amber-800 border-amber-300">
                      Internal Only
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Divider */}
        <div className="border-t pt-4" />

        {/* Input Area */}
        {user ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="comment-input" className="sr-only">
                New comment
              </Label>
              <Textarea
                id="comment-input"
                placeholder="Write a comment or note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-20 resize-none"
                disabled={isLoadingSubmit}
              />
            </div>

            {/* Internal Toggle - Only for BRAC Staff */}
            {isBracStaff && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-1">
                  <Switch
                    id="internal-toggle"
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                    disabled={isLoadingSubmit}
                  />
                  <Label
                    htmlFor="internal-toggle"
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    Mark as internal note (vendors cannot see)
                  </Label>
                </div>
              </div>
            )}

            {!isBracStaff && (
              <p className="text-xs text-muted-foreground italic">
                Your comments will be visible to the BRAC team.
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoadingSubmit || !newComment.trim()}
              className="w-full sm:w-auto"
            >
              {isLoadingSubmit ? 'Posting...' : 'Post Comment'}
            </Button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Please log in to comment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
