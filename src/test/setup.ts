/** Mock getUserMedia so camera-dependent components don't throw in tests */
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: () =>
      Promise.resolve({ getTracks: () => [], active: true } as unknown as MediaStream),
  },
  writable: true,
})
