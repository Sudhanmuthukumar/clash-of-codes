import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../utils/api';

const domains = [
  'SQL',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'Data Structures',
  'Algorithms',
  'Programming',
  'OOP',
  'Computer Architecture',
  'Cybersecurity',
  'Web Development',
  'Software Engineering',
  'General CS',
  'Logic',
];

const AdminHiddenTech = () => {
  const [selectedRound, setSelectedRound] = useState(1); // 1 = Round 1 (Event 2), 2 = Round 2 (Event 4)
  const [questions, setQuestions] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    title: '',
    marks: 20,
    final_output: '',
    final_output_marks: 5,
    sub_questions: [],
  });

  const toast = useToast();

  const activeEventId = selectedRound === 1 ? 2 : 4;

  const fetchData = async () => {
    try {
      const [qRes, evRes] = await Promise.all([
        api.get(`/admin/questions?event_id=${activeEventId}`),
        api.get('/admin/events'),
      ]);
      setQuestions(qRes.data);
      const ev = evRes.data.find(e => e.id === activeEventId || (selectedRound === 1 && e.name.toLowerCase().includes('round 1')) || (selectedRound === 2 && e.name.toLowerCase().includes('round 2')));
      setEventData(ev);
    } catch (err) {
      toast.error('Failed to load Crack the Code data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRound]);

  const handleOpenModal = (q = null) => {
    if (q) {
      const ht = q.hidden_tech_data || {};
      const subs = (ht.sub_questions || []).map((s, idx) => ({
        id: s.id || `sub-${idx}`,
        sub_question_number: s.sub_question_number || idx + 1,
        domain: s.domain || 'SQL',
        question_text: s.question_text || '',
        correct_answer: s.correct_answer || '',
        revealed_character: s.revealed_character || '',
        marks: s.marks || 5,
        hint: s.hint || '',
        hint_penalty: s.hint_penalty || 1,
      }));

      setFormData({
        id: q.id,
        title: q.title || '',
        marks: q.marks || 20,
        final_output: ht.final_output || '',
        final_output_marks: ht.final_output_marks || 5,
        sub_questions: subs,
      });
    } else {
      setFormData({
        id: null,
        title: `Question ${questions.length + 1}`,
        marks: 20,
        final_output: 'YOLO',
        final_output_marks: 5,
        sub_questions: [
          {
            id: 'temp-1',
            sub_question_number: 1,
            domain: 'SQL',
            question_text: 'What keyword retrieves data from a database table?',
            correct_answer: 'SELECT',
            revealed_character: 'Y',
            marks: 5,
            hint: 'Standard DQL statement',
            hint_penalty: 1,
          },
          {
            id: 'temp-2',
            sub_question_number: 2,
            domain: 'Operating Systems',
            question_text: 'What scheduling policy uses equal time slices?',
            correct_answer: 'ROUND ROBIN',
            revealed_character: 'O',
            marks: 5,
            hint: 'Preemptive queue rotation',
            hint_penalty: 1,
          },
        ],
      });
    }
    setShowModal(true);
  };

  const handleAddSub = () => {
    const nextNum = formData.sub_questions.length + 1;
    setFormData(prev => ({
      ...prev,
      sub_questions: [
        ...prev.sub_questions,
        {
          id: `temp-${Date.now()}`,
          sub_question_number: nextNum,
          domain: 'General CS',
          question_text: '',
          correct_answer: '',
          revealed_character: '',
          marks: 5,
          hint: '',
          hint_penalty: 1,
        },
      ],
    }));
  };

  const handleRemoveSub = (idx) => {
    setFormData(prev => ({
      ...prev,
      sub_questions: prev.sub_questions.filter((_, i) => i !== idx),
    }));
  };

  const handleSubChange = (idx, field, val) => {
    setFormData(prev => {
      const subs = [...prev.sub_questions];
      subs[idx] = { ...subs[idx], [field]: val };
      return { ...prev, sub_questions: subs };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.sub_questions.length === 0) {
      toast.error('Add at least one sub-question.');
      return;
    }

    try {
      if (formData.id) {
        await api.put(`/admin/questions/${formData.id}`, {
          title: formData.title,
          marks: parseInt(formData.marks, 10),
          final_output: formData.final_output,
          final_output_marks: parseInt(formData.final_output_marks, 10),
          sub_questions: formData.sub_questions.map((s, i) => ({
            ...s,
            sub_question_number: i + 1,
            marks: parseInt(s.marks, 10),
            hint_penalty: parseInt(s.hint_penalty, 10),
          })),
        });
        toast.success('Crack the Code question updated');
      } else {
        await api.post('/admin/questions/hidden-tech', {
          event_id: activeEventId,
          title: formData.title,
          marks: parseInt(formData.marks, 10),
          final_output: formData.final_output,
          final_output_marks: parseInt(formData.final_output_marks, 10),
          sub_questions: formData.sub_questions.map((s, idx) => ({
            sub_question_number: idx + 1,
            domain: s.domain,
            question_text: s.question_text,
            correct_answer: s.correct_answer,
            revealed_character: s.revealed_character,
            marks: parseInt(s.marks, 10),
            hint: s.hint,
            hint_penalty: parseInt(s.hint_penalty, 10),
          })),
        });
        toast.success('Crack the Code question created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save question');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/questions/${deleteId}`);
      toast.success('Question deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete question');
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.put(`/admin/questions/${id}/toggle`);
      toast.success('Question status updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle question');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/admin/questions/${id}/duplicate`);
      toast.success('Question duplicated');
      fetchData();
    } catch (err) {
      toast.error('Failed to duplicate question');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Crack the Code manager...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-1">
            ⚔️ CODE INVASION
          </span>
          <h1 className="text-3xl font-black text-amber-100 font-fantasy tracking-tight">
            CRACK THE CODE &mdash; Code Invasion
          </h1>
          <p className="text-stone-400 text-xs mt-1 font-sans">
            Craft multi-domain technical puzzles and passwords. Clans breach domain defenses to reveal password clues and crack the fortress gate.
          </p>
        </div>

        <button onClick={() => handleOpenModal()} className="btn-primary text-xs font-bold px-4 py-2 uppercase tracking-wide">
          + Forge Main Challenge
        </button>
      </div>

      {/* Round Selection Tabs */}
      <div className="flex border-b border-stone-800 font-sans text-sm">
        <button
          onClick={() => setSelectedRound(1)}
          className={`px-6 py-3 font-bold transition-all border-b-2 flex items-center gap-2 ${
            selectedRound === 1
              ? 'text-amber-400 border-amber-400 bg-amber-950/30'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <span>⚔️ Round 1 Pool (6 Puzzles)</span>
        </button>
        <button
          onClick={() => setSelectedRound(2)}
          className={`px-6 py-3 font-bold transition-all border-b-2 flex items-center gap-2 ${
            selectedRound === 2
              ? 'text-amber-400 border-amber-400 bg-amber-950/30'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <span>🔥 Round 2 Pool (6 Puzzles)</span>
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Question Pool</span>
          <span className="text-2xl font-bold font-mono text-white">{questions.length}</span>
        </div>
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Assigned Per Team</span>
          <span className="text-2xl font-bold font-mono text-purple-400">
            {eventData?.questions_per_team || 5}
          </span>
        </div>
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Active Questions</span>
          <span className="text-2xl font-bold font-mono text-cyan-400">
            {questions.filter(q => q.is_active).length}
          </span>
        </div>
        <div className="card p-3 text-center">
          <span className="text-xs text-gray-500 block uppercase">Total Sub-Puzzles</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {questions.reduce((acc, q) => acc + (q.hidden_tech_data?.sub_questions?.length || 0), 0)}
          </span>
        </div>
      </div>

      {/* Questions Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-950 text-gray-400 text-xs font-mono uppercase tracking-wider border-b border-dark-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Sub-Questions</th>
                <th className="py-3 px-4">Final Output (Secret)</th>
                <th className="py-3 px-4">Marks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 font-mono text-xs">
              {questions.map((q, idx) => {
                const ht = q.hidden_tech_data || {};
                const subs = ht.sub_questions || [];
                return (
                  <tr key={q.id} className="hover:bg-dark-800/40">
                    <td className="py-3 px-4 text-center text-gray-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      <div>{q.title}</div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        Domains: {Array.from(new Set(subs.map(s => s.domain))).join(', ') || 'None'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-cyan-300 font-bold">{subs.length} parts</td>
                    <td className="py-3 px-4 text-yellow-300 font-bold tracking-widest">{ht.final_output || '—'}</td>
                    <td className="py-3 px-4 text-purple-300 font-bold">{q.marks + (ht.final_output_marks || 0)} pts</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(q.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          q.is_active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                        }`}
                      >
                        {q.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 font-sans">
                      <button
                        onClick={() => handleOpenModal(q)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1 bg-dark-800 rounded border border-dark-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(q.id)}
                        className="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 bg-dark-800 rounded border border-dark-700"
                        title="Duplicate Question"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => setDeleteId(q.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-dark-800 rounded border border-dark-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto border-purple-800/60 bg-dark-900 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-3">
              <h3 className="text-xl font-bold text-white">
                {formData.id ? 'Edit Crack the Code Question' : 'Create Crack the Code Question'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white font-mono text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Main Question Title</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Final Output Word</label>
                  <input
                    type="text"
                    className="input-field text-sm font-mono uppercase tracking-widest"
                    placeholder="e.g. YOLO"
                    value={formData.final_output}
                    onChange={e => setFormData({ ...formData, final_output: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Final Output Marks</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field text-sm font-mono"
                    value={formData.final_output_marks}
                    onChange={e => setFormData({ ...formData, final_output_marks: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Sub-questions Header */}
              <div className="border-t border-dark-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                      Sub-Questions / Technical Puzzles ({formData.sub_questions.length})
                    </h4>
                    <p className="text-xs text-gray-400">
                      Configure multiple domains. Each completed puzzle reveals one component of the derived output.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSub}
                    className="btn-secondary text-xs px-3 py-1.5 text-cyan-400 border-cyan-800/60"
                  >
                    + Add Sub-Question
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {formData.sub_questions.map((sq, idx) => (
                    <div key={sq.id || idx} className="p-4 rounded-lg bg-dark-950 border border-dark-700/80 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-bold text-purple-300">
                          Part #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSub(idx)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove Part
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-4 gap-3">
                        <div>
                          <label className="label text-[11px]">Domain</label>
                          <select
                            className="input-field text-xs"
                            value={sq.domain}
                            onChange={e => handleSubChange(idx, 'domain', e.target.value)}
                          >
                            {domains.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="label text-[11px]">Correct Answer (Exact check)</label>
                          <input
                            type="text"
                            className="input-field text-xs font-mono"
                            placeholder="e.g. SELECT or STACK"
                            value={sq.correct_answer}
                            onChange={e => handleSubChange(idx, 'correct_answer', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="label text-[11px]">Revealed Char</label>
                          <input
                            type="text"
                            maxLength="3"
                            className="input-field text-xs font-mono uppercase text-center"
                            placeholder="e.g. S"
                            value={sq.revealed_character}
                            onChange={e => handleSubChange(idx, 'revealed_character', e.target.value.toUpperCase())}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label text-[11px]">Question Prompt</label>
                        <textarea
                          rows="2"
                          className="input-field text-xs"
                          placeholder="Enter technical puzzle question..."
                          value={sq.question_text}
                          onChange={e => handleSubChange(idx, 'question_text', e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="label text-[11px]">Marks</label>
                          <input
                            type="number"
                            min="1"
                            className="input-field text-xs font-mono"
                            value={sq.marks}
                            onChange={e => handleSubChange(idx, 'marks', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label text-[11px]">Optional Hint</label>
                          <input
                            type="text"
                            className="input-field text-xs"
                            value={sq.hint}
                            onChange={e => handleSubChange(idx, 'hint', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label text-[11px]">Hint Penalty</label>
                          <input
                            type="number"
                            min="0"
                            className="input-field text-xs font-mono"
                            value={sq.hint_penalty}
                            onChange={e => handleSubChange(idx, 'hint_penalty', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm font-bold">
                  {formData.id ? 'Save Changes' : 'Create Main Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Crack the Code Question?"
        message="Are you sure you want to permanently delete this main question and all its sub-questions?"
        confirmText="Delete"
      />
    </div>
  );
};

export default AdminHiddenTech;
