export const schoolDirectoryQueryKeys = {
  studentsRoot: (schoolId) => ['students', schoolId],
  studentProfile: (studentId) => ['student-profile', studentId],
  parentsRoot: (schoolId) => ['parents', schoolId],
  parentProfile: (parentId) => ['parent-profile', parentId],
  profilesRoot: (schoolId) => ['profiles', schoolId],
};

export function snapshotQueries(queryClient, queryKey) {
  return queryClient.getQueriesData({ queryKey });
}

export function restoreQueries(queryClient, snapshots = []) {
  snapshots.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
}

function updateStudentCollection(data, updater) {
  if (!data || !Array.isArray(data.students)) return data;

  const previousStudents = data.students;
  const nextStudents = updater(previousStudents);

  if (nextStudents === previousStudents) {
    return data;
  }

  const previousActiveCount = previousStudents.filter((student) => student?.user?.status === 'ACTIVE').length;
  const nextActiveCount = nextStudents.filter((student) => student?.user?.status === 'ACTIVE').length;
  const removedCount = Math.max(0, previousStudents.length - nextStudents.length);

  return {
    ...data,
    students: nextStudents,
    total: typeof data.total === 'number' ? Math.max(0, data.total - removedCount) : data.total,
    activeCount: typeof data.activeCount === 'number'
      ? Math.max(0, data.activeCount - Math.max(0, previousActiveCount - nextActiveCount))
      : data.activeCount,
    totalPages: typeof data.totalPages === 'number' && typeof data.limit === 'number' && data.limit > 0
      ? Math.max(1, Math.ceil(Math.max(0, (data.total ?? nextStudents.length) - removedCount) / data.limit))
      : data.totalPages,
  };
}

function updateParentCollection(data, updater) {
  if (!data || !Array.isArray(data.parents)) return data;

  const previousParents = data.parents;
  const nextParents = updater(previousParents);

  if (nextParents === previousParents) {
    return data;
  }

  const previousActiveCount = previousParents.filter((parent) => parent?.user?.status === 'ACTIVE').length;
  const nextActiveCount = nextParents.filter((parent) => parent?.user?.status === 'ACTIVE').length;
  const removedCount = Math.max(0, previousParents.length - nextParents.length);

  return {
    ...data,
    parents: nextParents,
    total: typeof data.total === 'number' ? Math.max(0, data.total - removedCount) : data.total,
    activeCount: typeof data.activeCount === 'number'
      ? Math.max(0, data.activeCount - Math.max(0, previousActiveCount - nextActiveCount))
      : data.activeCount,
    totalPages: typeof data.totalPages === 'number' && typeof data.limit === 'number' && data.limit > 0
      ? Math.max(1, Math.ceil(Math.max(0, (data.total ?? nextParents.length) - removedCount) / data.limit))
      : data.totalPages,
  };
}

export function optimisticallyRemoveStudents(queryClient, schoolId, studentIds) {
  queryClient.setQueriesData(
    { queryKey: schoolDirectoryQueryKeys.studentsRoot(schoolId) },
    (data) => updateStudentCollection(data, (students) => students.filter((student) => !studentIds.includes(student?.userId)))
  );
}

export function optimisticallySetStudentStatus(queryClient, schoolId, studentIds, status) {
  queryClient.setQueriesData(
    { queryKey: schoolDirectoryQueryKeys.studentsRoot(schoolId) },
    (data) => updateStudentCollection(data, (students) => students.map((student) => (
      studentIds.includes(student?.userId)
        ? { ...student, user: { ...student.user, status } }
        : student
    )))
  );
}

export function optimisticallyPatchStudentProfile(queryClient, studentId, patch) {
  queryClient.setQueryData(
    schoolDirectoryQueryKeys.studentProfile(studentId),
    (current) => current ? { ...current, ...patch } : current
  );
}

export function optimisticallyPatchStudentLists(queryClient, schoolId, studentId, patch) {
  queryClient.setQueriesData(
    { queryKey: schoolDirectoryQueryKeys.studentsRoot(schoolId) },
    (data) => updateStudentCollection(data, (students) => students.map((student) => (
      student?.userId === studentId
        ? {
            ...student,
            ...patch,
            user: patch?.status || patch?.profilePicture || patch?.name || patch?.email
              ? {
                  ...student.user,
                  ...(patch.status ? { status: patch.status } : {}),
                  ...(patch.profilePicture ? { profilePicture: patch.profilePicture } : {}),
                  ...(patch.name ? { name: patch.name } : {}),
                  ...(patch.email ? { email: patch.email } : {}),
                }
              : student.user,
          }
        : student
    )))
  );
}

export function optimisticallyRemoveParents(queryClient, schoolId, parentIds) {
  queryClient.setQueriesData(
    { queryKey: schoolDirectoryQueryKeys.parentsRoot(schoolId) },
    (data) => updateParentCollection(data, (parents) => parents.filter((parent) => !parentIds.includes(parent?.id)))
  );
}

export function optimisticallySetParentStatus(queryClient, schoolId, parentIds, status) {
  queryClient.setQueriesData(
    { queryKey: schoolDirectoryQueryKeys.parentsRoot(schoolId) },
    (data) => updateParentCollection(data, (parents) => parents.map((parent) => (
      parentIds.includes(parent?.id)
        ? { ...parent, user: { ...parent.user, status } }
        : parent
    )))
  );
}

export function optimisticallyPatchParentProfile(queryClient, parentId, patch) {
  queryClient.setQueryData(
    schoolDirectoryQueryKeys.parentProfile(parentId),
    (current) => current ? { ...current, ...patch } : current
  );
}

export function optimisticallyPatchParentLists(queryClient, schoolId, parentId, patch) {
  queryClient.setQueriesData(
    { queryKey: schoolDirectoryQueryKeys.parentsRoot(schoolId) },
    (data) => updateParentCollection(data, (parents) => parents.map((parent) => (
      parent?.id === parentId
        ? {
            ...parent,
            ...patch,
            user: patch?.status || patch?.profilePicture || patch?.name || patch?.email
              ? {
                  ...parent.user,
                  ...(patch.status ? { status: patch.status } : {}),
                  ...(patch.profilePicture ? { profilePicture: patch.profilePicture } : {}),
                  ...(patch.name ? { name: patch.name } : {}),
                  ...(patch.email ? { email: patch.email } : {}),
                }
              : parent.user,
          }
        : parent
    )))
  );
}
