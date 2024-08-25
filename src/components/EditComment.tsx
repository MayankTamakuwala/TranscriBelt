import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Comment } from '@/types';

interface EditCommentProps {
    comment: Comment;
    onSave: (editedText: string) => void;
    onCancel: () => void;
}

const EditComment: React.FC<EditCommentProps> = ({ comment, onSave, onCancel }) => {
    const [editedText, setEditedText] = useState(comment.text);

    return (
        <div className="mt-2">
            <Input
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="mb-2"
            />
            <div className="flex space-x-2">
                <Button onClick={() => onSave(editedText)}>Save</Button>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
};

export default EditComment