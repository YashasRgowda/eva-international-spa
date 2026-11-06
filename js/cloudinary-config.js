// Cloudinary (free plan, no billing) stores the photos the admin uploads.
// An unsigned preset is safe to expose: it only allows uploads into the "eva" folder.
export const cloudinaryConfig = {
  cloudName: "cq5adi0u",
  uploadPreset: "eva_admin",
};
