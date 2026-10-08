import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const locationSchema = new Schema(
  {
    formattedAddress: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    googlePlaceId: { type: String },
  },
  { _id: false },
);

const weddingSchema = new Schema(
  {
    brideName: { type: String, required: true },
    groomName: { type: String, required: true },
    title: { type: String },
    description: { type: String },
    weddingDate: { type: String, required: true },
    timeZone: { type: String, required: true, default: "Asia/Kolkata" },
    coverImageObjectKey: { type: String },
    location: { type: locationSchema, default: {} },
    website: {
      slug: { type: String, required: true, unique: true },
      theme: { type: String, default: "CLASSIC" },
      isPublished: { type: Boolean, default: false },
      welcomeMessage: { type: String },
    },
    gallery: {
      tokenHash: { type: String, required: true, unique: true },
      isEnabled: { type: Boolean, default: true },
      guestUploadsEnabled: { type: Boolean, default: true },
    },
    livestream: {
      youtubeUrl: { type: String },
      isEnabled: { type: Boolean, default: false },
    },
    createdByUserId: { type: Schema.Types.ObjectId, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "weddings" },
);
weddingSchema.index({ createdAt: 1 });

const weddingMembershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    weddingId: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "wedding_memberships" },
);
weddingMembershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });
weddingMembershipSchema.index({ weddingId: 1, role: 1 });

const weddingMemberInvitationSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED"],
      required: true,
      default: "PENDING",
    },
    invitedByUserId: { type: Schema.Types.ObjectId, required: true },
    acceptedByUserId: { type: Schema.Types.ObjectId },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true, collection: "wedding_member_invitations" },
);
weddingMemberInvitationSchema.index({ weddingId: 1, status: 1 });
weddingMemberInvitationSchema.index({ emailNormalized: 1 });
weddingMemberInvitationSchema.index({ expiresAt: 1 });
weddingMemberInvitationSchema.index(
  { weddingId: 1, emailNormalized: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } },
);

export const Wedding =
  (mongoose.models.Wedding as Model<InferSchemaType<typeof weddingSchema>>) ||
  mongoose.model("Wedding", weddingSchema);
export const WeddingMembership =
  (mongoose.models.WeddingMembership as Model<
    InferSchemaType<typeof weddingMembershipSchema>
  >) || mongoose.model("WeddingMembership", weddingMembershipSchema);
export const WeddingMemberInvitation =
  (mongoose.models.WeddingMemberInvitation as Model<
    InferSchemaType<typeof weddingMemberInvitationSchema>
  >) ||
  mongoose.model("WeddingMemberInvitation", weddingMemberInvitationSchema);
