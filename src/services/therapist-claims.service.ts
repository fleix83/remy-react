import { supabase } from '../lib/supabase'
import type {
  TherapistClaim,
  TherapistClaimCandidate,
  TherapistWithDesignation,
} from '../types/database.types'

/** Result of the idempotent `claim_therapist_profile()` RPC. */
export type ClaimResult =
  | { status: 'not_verified' }
  | { status: 'linked'; therapist_id: number }
  | { status: 'pending'; claim_id: number }
  | { status: 'rejected'; claim_id: number; note: string | null }

/** What the profile page shows a verified therapist about their directory entry. */
export type OwnTherapistStatus =
  | { status: 'not_verified' }
  | { status: 'linked'; therapist: TherapistWithDesignation }
  | { status: 'pending'; claim: TherapistClaim }
  | { status: 'rejected'; claim: TherapistClaim }
  | { status: 'none' }

export interface PendingClaim extends TherapistClaim {
  users: { id: string; username: string; avatar_url: string | null; default_canton: string | null; created_at: string | null } | null
  therapists: Pick<
    TherapistWithDesignation,
    'id' | 'first_name' | 'last_name' | 'form_of_address' | 'institution' | 'canton' | 'city' | 'user_id'
  > | null
}

export type ClaimAction = 'link' | 'create' | 'reject'

const THERAPIST_SELECT = '*, designations(id, slug, label_de, label_fr, label_it)'

export class TherapistClaimsService {
  /**
   * Ask the server to match the caller's verified HIN name against the
   * directory. Safe to call repeatedly: it returns the current state when a
   * link or claim already exists.
   */
  async claimOwnProfile(): Promise<ClaimResult> {
    const { data, error } = await supabase.rpc('claim_therapist_profile')
    if (error) {
      console.error('Error claiming therapist profile:', error)
      throw error
    }
    return data as unknown as ClaimResult
  }

  /** Current link / claim state for the signed-in user (no side effects). */
  async getOwnStatus(userId: string, verified: boolean): Promise<OwnTherapistStatus> {
    if (!verified) return { status: 'not_verified' }

    const [{ data: therapist, error: tErr }, { data: claims, error: cErr }] = await Promise.all([
      supabase.from('therapists').select(THERAPIST_SELECT).eq('user_id', userId).maybeSingle(),
      supabase
        .from('therapist_claims')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ])
    if (tErr) throw tErr
    if (cErr) throw cErr

    if (therapist) return { status: 'linked', therapist: therapist as TherapistWithDesignation }
    const claim = claims?.[0]
    if (claim?.status === 'pending') return { status: 'pending', claim }
    if (claim?.status === 'rejected') return { status: 'rejected', claim }
    return { status: 'none' }
  }

  // ---- moderation ---------------------------------------------------------

  async getPendingClaims(): Promise<PendingClaim[]> {
    const { data, error } = await supabase
      .from('therapist_claims')
      .select(`
        *,
        users!therapist_claims_user_id_fkey(id, username, avatar_url, default_canton, created_at),
        therapists!therapist_claims_therapist_id_fkey(id, first_name, last_name, form_of_address, institution, canton, city, user_id)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Error fetching therapist claims:', error)
      throw error
    }
    return (data || []) as unknown as PendingClaim[]
  }

  async getCandidates(claimId: number): Promise<TherapistClaimCandidate[]> {
    const { data, error } = await supabase.rpc('get_therapist_claim_candidates', { p_claim_id: claimId })
    if (error) {
      console.error('Error fetching claim candidates:', error)
      throw error
    }
    return (data || []) as TherapistClaimCandidate[]
  }

  async resolveClaim(
    claimId: number,
    action: ClaimAction,
    therapistId?: number | null,
    note?: string | null
  ): Promise<{ status: string; therapist_id?: number }> {
    const { data, error } = await supabase.rpc('resolve_therapist_claim', {
      p_claim_id: claimId,
      p_action: action,
      p_therapist_id: therapistId ?? null,
      p_note: note ?? null,
    })
    if (error) {
      console.error('Error resolving claim:', error)
      throw error
    }
    return data as unknown as { status: string; therapist_id?: number }
  }

  async unlinkTherapist(therapistId: number): Promise<void> {
    const { error } = await supabase.rpc('unlink_therapist_profile', { p_therapist_id: therapistId })
    if (error) {
      console.error('Error unlinking therapist:', error)
      throw error
    }
  }
}

export const therapistClaimsService = new TherapistClaimsService()
